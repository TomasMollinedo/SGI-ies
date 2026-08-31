import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ALERTA, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryAlertaDto } from './dto/query-alerta.dto';
import { RolNombre } from '../../common/enums/rol.enum';
import { TipoAlertaNombre } from '../../common/enums/tipo-alerta.enum';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

/**
 * Datos con los que otro service pide que se genere una alerta. Quien llama
 * trabaja con los enums del código, no con ids de la base: resolverlos es
 * responsabilidad de este service.
 */
export interface CrearAlertaInput {
  tipoAlertaNombre: TipoAlertaNombre;
  rolDestinatario: RolNombre;
  mensaje: string;
  datos?: Record<string, unknown>;
  /**
   * Identifica la condición concreta que dispara la alerta, ej.
   * `REPOSICION-42`. Mientras exista una alerta sin atender con esta misma
   * clave, no se genera otra.
   *
   * La arma quien llama, a partir del enum del tipo y del id de la entidad
   * afectada — cada tipo de alerta define su propio criterio. Tiene que ser
   * idéntica entre todos los caminos que detectan la misma condición: si dos
   * caminos la construyen distinto, cada uno cree que la condición es nueva y
   * la deduplicación deja de funcionar entre ellos.
   */
  claveDeduplicacion: string;
}

const ALERTA_INCLUDE = {
  tipoAlerta: {
    select: { id_tipo_alerta: true, nombre: true, descripcion: true },
  },
  rolDestinatario: { select: { nombre: true } },
  usuarioAtencion: { select: { nombre: true, apellido: true } },
} as const;

@Injectable()
export class AlertaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra una alerta, si no hay ya una activa por la misma condición. No se
   * expone por HTTP: lo llaman otros services cuando detectan la condición que
   * la dispara (hoy, MovimientoService al quedar una ficha bajo su umbral, y
   * el escaneo periódico de StockService).
   *
   * Deduplica por `claveDeduplicacion` contra las alertas NO atendidas: si ya
   * hay una abierta por lo mismo, devuelve esa con `creada: false` en vez de
   * apilar una segunda. En cuanto alguien la marca como atendida deja de
   * contar, así que si la condición sigue vigente la próxima detección genera
   * una alerta nueva — que es lo que evita que un problema no resuelto
   * desaparezca por haber sido "reconocido".
   *
   * Ojo: el chequeo y la creación no son atómicos entre sí. Dos llamadas con
   * la misma clave en el mismo instante (por ejemplo el escaneo y un
   * movimiento sobre la misma ficha) pueden generar una alerta duplicada. Se
   * acepta a propósito: el peor caso es una fila de más, no un dato corrupto,
   * y no justifica la complejidad del update atómico condicional que sí usa el
   * descuento de stock.
   */
  async crear(
    input: CrearAlertaInput,
  ): Promise<{ alerta: ALERTA; creada: boolean }> {
    const existente = await this.prisma.aLERTA.findFirst({
      where: {
        clave_deduplicacion: input.claveDeduplicacion,
        atendida: false,
      },
    });

    if (existente) {
      return { alerta: existente, creada: false };
    }

    const [tipoAlerta, rol] = await Promise.all([
      this.prisma.tIPOALERTA.findUnique({
        where: { nombre: input.tipoAlertaNombre },
      }),
      this.prisma.rOL.findUnique({ where: { nombre: input.rolDestinatario } }),
    ]);

    // Si alguno no resuelve no es culpa de ningún cliente: o el seed de las
    // tablas de referencia no se corrió, o quien llamó pasó un valor que no
    // está en el enum. Por eso 500 y no NotFoundException, que en este
    // proyecto significa "el cliente pidió algo que no existe".
    if (!tipoAlerta || !rol) {
      throw new InternalServerErrorException(
        `No se pudo resolver el tipo de alerta o el rol destinatario (tipo: ${input.tipoAlertaNombre}, rol: ${input.rolDestinatario})`,
      );
    }

    const nueva = await this.prisma.aLERTA.create({
      data: {
        FK_tipo_alerta: tipoAlerta.id_tipo_alerta,
        FK_rol_destinatario: rol.id_rol,
        mensaje: input.mensaje,
        datos: input.datos as Prisma.InputJsonValue | undefined,
        clave_deduplicacion: input.claveDeduplicacion,
      },
    });

    return { alerta: nueva, creada: true };
  }

  /**
   * Listado paginado, acotado a lo que le corresponde ver al usuario
   * autenticado (ver `esGerenteGeneral`).
   */
  async findAll(query: QueryAlertaDto, currentUser: AuthenticatedUser) {
    const { FK_tipo_alerta, atendida, fechaDesde, fechaHasta, page, limit } =
      query;

    const where: Prisma.ALERTAWhereInput = {
      ...this.filtroPorRol(currentUser),
      ...(FK_tipo_alerta !== undefined && { FK_tipo_alerta }),
      ...(atendida !== undefined && { atendida }),
      ...((fechaDesde !== undefined || fechaHasta !== undefined) && {
        hora_creacion: {
          ...(fechaDesde !== undefined && { gte: fechaDesde }),
          ...(fechaHasta !== undefined && { lte: fechaHasta }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.aLERTA.findMany({
        where,
        include: ALERTA_INCLUDE,
        skip: (page - 1) * limit,
        take: limit,
        // Más recientes primero: es lo que se mira en un panel de alertas.
        orderBy: { hora_creacion: 'desc' },
      }),
      this.prisma.aLERTA.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  /**
   * Detalle de una alerta.
   *
   * Si la alerta existe pero es de otro rol, devuelve el mismo 404 que si no
   * existiera: no hace falta confirmarle a alguien que un recurso existe si no
   * puede verlo.
   */
  async findOne(id: number, currentUser: AuthenticatedUser) {
    const alerta = await this.prisma.aLERTA.findUnique({
      where: { id_alerta: id },
      include: ALERTA_INCLUDE,
    });

    if (
      !alerta ||
      !this.leCorresponde(alerta.rolDestinatario.nombre, currentUser)
    ) {
      throw new NotFoundException(`No existe una alerta con id ${id}`);
    }

    return alerta;
  }

  /**
   * Marca una alerta como atendida y deja registrado quién y cuándo.
   *
   * Es una transición de un solo sentido: no hay forma de desmarcarla.
   */
  async atender(id: number, currentUser: AuthenticatedUser) {
    // Reusa el chequeo de "no te corresponde" = 404 de findOne.
    const alerta = await this.findOne(id, currentUser);

    if (alerta.atendida) {
      throw new ConflictException(`La alerta con id ${id} ya está atendida`);
    }

    await this.prisma.aLERTA.update({
      where: { id_alerta: id },
      data: {
        atendida: true,
        FK_usuario_atencion: currentUser.id,
        fecha_atencion: new Date(),
      },
    });

    // Se devuelve por findOne para que la respuesta tenga el mismo shape que
    // el resto de los endpoints (con tipoAlerta, rol y usuarioAtencion
    // resueltos), y no el registro pelado que devuelve update.
    return this.findOne(id, currentUser);
  }

  /**
   * Tipos de alerta disponibles, para poblar el filtro del frontend.
   * TIPOALERTA es una tabla de referencia chica y fija, así que no se pagina.
   */
  async findTipos() {
    return this.prisma.tIPOALERTA.findMany({ orderBy: { nombre: 'asc' } });
  }

  /**
   * Los roles con acceso transversal (ver `veTodasLasAlertas`) ven las alertas
   * de todos los roles; cualquier otro usuario ve solo las dirigidas al suyo.
   *
   * Es el mismo bypass que aplica `RolesGuard`, pero replicado a mano: un
   * guard solo puede decidir "entra o no entra", y acá lo que hace falta es
   * recortar QUÉ filas se devuelven, no bloquear el endpoint.
   */
  private filtroPorRol(
    currentUser: AuthenticatedUser,
  ): Prisma.ALERTAWhereInput {
    if (this.veTodasLasAlertas(currentUser)) {
      return {};
    }

    return { rolDestinatario: { nombre: currentUser.rol } };
  }

  private leCorresponde(
    rolDestinatario: string,
    currentUser: AuthenticatedUser,
  ) {
    if (this.veTodasLasAlertas(currentUser)) {
      return true;
    }

    // ROL.nombre llega de la base tipado como string; los valores que guarda
    // son exactamente los del enum RolNombre, que es lo que siembra el seed.
    return rolDestinatario === (currentUser.rol as string);
  }

  /**
   * Roles con acceso transversal a las alertas: ven —y pueden atender— las de
   * cualquier rol destinatario, no solo las dirigidas al suyo.
   *
   * El Administrador tiene acá las mismas facultades que el Gerente General.
   * Es también la forma en que le llegan las alertas dirigidas al Responsable
   * de Almacén: la alerta se sigue generando con ese rol como destinatario y
   * el Administrador la ve por este bypass, sin duplicar una fila de ALERTA
   * por cada rol que tenga que enterarse.
   */
  private veTodasLasAlertas(currentUser: AuthenticatedUser) {
    return (
      currentUser.rol === RolNombre.GERENTE_GENERAL ||
      currentUser.rol === RolNombre.ADMINISTRADOR
    );
  }
}
