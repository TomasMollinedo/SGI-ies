import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
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
   * Registra una alerta. No se expone por HTTP: lo llaman otros services
   * cuando detectan la condición que la dispara (hoy, MovimientoService al
   * cruzarse el umbral mínimo de una ficha de stock).
   */
  async crear(input: CrearAlertaInput) {
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

    return this.prisma.aLERTA.create({
      data: {
        FK_tipo_alerta: tipoAlerta.id_tipo_alerta,
        FK_rol_destinatario: rol.id_rol,
        mensaje: input.mensaje,
        datos: input.datos as Prisma.InputJsonValue | undefined,
      },
    });
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
   * El Gerente General ve las alertas de todos los roles; cualquier otro
   * usuario ve solo las dirigidas al suyo.
   *
   * Es el mismo bypass que aplica `RolesGuard`, pero replicado a mano: un
   * guard solo puede decidir "entra o no entra", y acá lo que hace falta es
   * recortar QUÉ filas se devuelven, no bloquear el endpoint.
   */
  private filtroPorRol(
    currentUser: AuthenticatedUser,
  ): Prisma.ALERTAWhereInput {
    if (currentUser.rol === RolNombre.GERENTE_GENERAL) {
      return {};
    }

    return { rolDestinatario: { nombre: currentUser.rol } };
  }

  private leCorresponde(
    rolDestinatario: string,
    currentUser: AuthenticatedUser,
  ) {
    if (currentUser.rol === RolNombre.GERENTE_GENERAL) {
      return true;
    }

    // ROL.nombre llega de la base tipado como string; los valores que guarda
    // son exactamente los del enum RolNombre, que es lo que siembra el seed.
    return rolDestinatario === (currentUser.rol as string);
  }
}
