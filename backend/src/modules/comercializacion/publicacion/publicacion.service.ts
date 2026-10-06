import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import {
  EstadoComercial,
  EstadoProyecto,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { calcularCondicionEntrega } from '../common/condicion-entrega';
import {
  advertenciaPrecioMenorAlCosto,
  porcentajeGananciaSobreCosto,
} from '../common/precio-sobre-costo';
import { CreatePublicacionDto } from './dto/create-publicacion.dto';
import { DefinirPrecioListaDto } from './dto/definir-precio-lista.dto';
import { DespublicarPublicacionDto } from './dto/despublicar-publicacion.dto';
import { QueryPublicacionDto } from './dto/query-publicacion.dto';
import { QueryUnidadesPublicablesDto } from './dto/query-unidades-publicables.dto';
import { USUARIO_RESUMEN_SELECT } from '../../../common/selects/usuario-resumen.select';

/**
 * Reusado por `publicar` (rechazo) y `findUnidadesPublicables` (motivo de
 * `publicable: false`), para que el mensaje nunca quede desincronizado entre
 * los dos endpoints.
 */
const MOTIVO_PROYECTO_EN_PLANIFICACION =
  'No se puede publicar la unidad: su proyecto está En planificación. Solo pueden publicarse unidades de proyectos En ejecución (venta en pozo) o Finalizados (unidad terminada).';

const ESTADO_COMERCIAL_LABELS: Record<EstadoComercial, string> = {
  EN_PREPARACION: 'En Preparación',
  DISPONIBLE: 'Disponible',
  EN_PLAN_DE_PAGO: 'En Plan de Pago',
  VENDIDA: 'Vendida',
};

/**
 * Transiciones permitidas de `estado_comercial` (HU-21). Cada
 * transición documenta quién la dispara; este service solo expone el
 * mecanismo genérico (`transicionarEstadoComercial`), sin endpoint propio.
 */
const TRANSICIONES_PERMITIDAS: Record<EstadoComercial, EstadoComercial[]> = {
  // Se define el precio de lista por primera vez (T133).
  EN_PREPARACION: [EstadoComercial.DISPONIBLE],
  // Se confirma una venta (HU-27). No hay vuelta a EN_PREPARACION: una vez
  // definido, el precio de lista se puede cambiar pero nunca quitar.
  DISPONIBLE: [EstadoComercial.EN_PLAN_DE_PAGO],
  // Cancelación de la venta, o saldo total en cero.
  EN_PLAN_DE_PAGO: [EstadoComercial.DISPONIBLE, EstadoComercial.VENDIDA],
  // Anulación de un cobro que reabre saldo.
  VENDIDA: [EstadoComercial.EN_PLAN_DE_PAGO],
};

/** `Decimal(5, 2)`: el porcentaje más alto que entra en la columna. */
const PORCENTAJE_GANANCIA_MAXIMO = new Prisma.Decimal('999.99');

const PROYECTO_RESUMEN_SELECT = {
  id_proyecto: true,
  codigo: true,
  nombre: true,
  localidad: true,
  estado_obra: true,
  fecha_fin_estimada: true,
} as const;

/**
 * Incluye `costo` porque este select alimenta SOLO al detalle
 * (`PUBLICACION_DETALLE_SELECT` → `findOne`), que es de la pantalla interna de
 * Comercialización y pide rol ADMINISTRADOR: ahí el costo es justamente el
 * dato contra el que se arman los planes de pago (HU-22).
 *
 * El listado tiene su propio select, más chico, y el catálogo público
 * (`CatalogoService`) también — ninguno de los dos lo trae, y ahí sí no debe
 * aparecer nunca.
 */
const UNIDAD_CON_PROYECTO_E_IMAGENES_SELECT = {
  id_unidad_funcional: true,
  identificador: true,
  tipologia: true,
  superficie_cubierta: true,
  superficie_descubierta: true,
  piso: true,
  comodidades: true,
  observaciones: true,
  costo: true,
  imagenes: {
    select: { id_imagen_unidad: true, url: true, orden: true },
    orderBy: { orden: 'asc' as const },
  },
  proyecto: { select: PROYECTO_RESUMEN_SELECT },
} as const;

const PUBLICACION_DETALLE_SELECT = {
  id_publicacion: true,
  FK_unidad_funcional: true,
  estado_comercial: true,
  vigente: true,
  precio_lista: true,
  porcentaje_ganancia: true,
  margen: true,
  fecha_publicacion: true,
  fecha_despublicacion: true,
  motivo_despublicacion: true,
  hora_creacion: true,
  hora_actualizacion: true,
  FK_usuario_creador: true,
  FK_usuario_actualizador: true,
  usuarioCreador: { select: USUARIO_RESUMEN_SELECT },
  usuarioActualizador: { select: USUARIO_RESUMEN_SELECT },
  unidadFuncional: { select: UNIDAD_CON_PROYECTO_E_IMAGENES_SELECT },
} as const;

type PublicacionDetalle = Prisma.PUBLICACIONUNIDADGetPayload<{
  select: typeof PUBLICACION_DETALLE_SELECT;
}>;

@Injectable()
export class PublicacionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Publica una unidad funcional en el ecommerce. Todo dentro de una única
   * `$transaction`: primero bloquea la fila de la unidad con
   * `SELECT ... FOR UPDATE` (lock pesimista) y recién después valida y crea
   * A diferencia de `despublicar`/
   * `transicionarEstadoComercial` (lock optimista, con el estado previo en
   * el WHERE de un `updateMany`), publicar es un INSERT: no existe ninguna
   * fila previa de `PUBLICACIONUNIDAD` cuyo valor poner en esa condición, así
   * que el optimista no alcanza para impedir dos publicaciones concurrentes
   * de la misma unidad. El `FOR UPDATE` serializa esas dos transacciones: la
   * segunda espera el lock y, al tomarlo, ya encuentra la publicación
   * vigente que creó la primera.
   */
  async publicar(dto: CreatePublicacionDto, usuarioId: number) {
    const idPublicacion = await this.prisma.$transaction(async (tx) => {
      const filas = await tx.$queryRaw<
        { id_unidad_funcional: number; estado: boolean; FK_proyecto: number }[]
      >(
        Prisma.sql`SELECT "id_unidad_funcional", "estado", "FK_proyecto" FROM "UNIDADFUNCIONAL" WHERE "id_unidad_funcional" = ${dto.FK_unidad_funcional} FOR UPDATE`,
      );
      const unidad = filas[0];
      if (!unidad) {
        throw new NotFoundException(
          `No existe una unidad funcional con id ${dto.FK_unidad_funcional}`,
        );
      }
      if (!unidad.estado) {
        throw new ConflictException(
          'No se puede publicar la unidad: fue dada de baja.',
        );
      }

      // No se valida que exista: FK_proyecto es una FK NOT NULL, el proyecto
      // siempre existe.
      const proyecto = (await tx.pROYECTO.findUnique({
        where: { id_proyecto: unidad.FK_proyecto },
        select: { estado_obra: true },
      }))!;
      if (proyecto.estado_obra === EstadoProyecto.EN_PLANIFICACION) {
        throw new ConflictException(MOTIVO_PROYECTO_EN_PLANIFICACION);
      }
      if (proyecto.estado_obra === EstadoProyecto.CANCELADO) {
        throw new ConflictException(
          'No se puede publicar la unidad: su proyecto fue cancelado.',
        );
      }

      const publicacionVigente = await tx.pUBLICACIONUNIDAD.findFirst({
        where: { FK_unidad_funcional: dto.FK_unidad_funcional, vigente: true },
        select: { id_publicacion: true },
      });
      if (publicacionVigente) {
        throw new ConflictException({
          message:
            'La unidad ya tiene una publicación vigente. Para volver a publicarla, primero despublicá la publicación actual.',
          datos: { id_publicacion_vigente: publicacionVigente.id_publicacion },
        });
      }

      const publicacion = await tx.pUBLICACIONUNIDAD.create({
        data: {
          FK_unidad_funcional: dto.FK_unidad_funcional,
          estado_comercial: EstadoComercial.EN_PREPARACION,
          vigente: true,
          FK_usuario_creador: usuarioId,
          FK_usuario_actualizador: usuarioId,
        },
        select: { id_publicacion: true },
      });

      return publicacion.id_publicacion;
    });

    return this.findOne(idPublicacion);
  }

  /**
   * Despublica una publicación vigente, solo permitido en EN_PREPARACION o
   * DISPONIBLE. No toca `estado_comercial`, planes de pago ni consultas: los
   * planes quedan colgando de la publicación no vigente a propósito (ver
   * comentario de T107 en `findOne`).
   */
  async despublicar(
    id: number,
    dto: DespublicarPublicacionDto,
    usuarioId: number,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const publicacion = await tx.pUBLICACIONUNIDAD.findUnique({
        where: { id_publicacion: id },
        select: { vigente: true, estado_comercial: true },
      });
      if (!publicacion) {
        throw new NotFoundException(`No existe una publicación con id ${id}`);
      }
      if (!publicacion.vigente) {
        throw new ConflictException('La publicación ya fue despublicada.');
      }
      if (
        publicacion.estado_comercial === EstadoComercial.EN_PLAN_DE_PAGO ||
        publicacion.estado_comercial === EstadoComercial.VENDIDA
      ) {
        throw new ConflictException(
          `No se puede despublicar: la unidad está ${ESTADO_COMERCIAL_LABELS[publicacion.estado_comercial]}. Solo pueden despublicarse unidades en Publicación en preparación o Disponible.`,
        );
      }

      // Lock optimista: el WHERE lleva el estado previo exacto, mismo
      // criterio que el `updateMany` de saldo en PagoService.create.
      const { count } = await tx.pUBLICACIONUNIDAD.updateMany({
        where: {
          id_publicacion: id,
          vigente: true,
          estado_comercial: {
            in: [EstadoComercial.EN_PREPARACION, EstadoComercial.DISPONIBLE],
          },
        },
        data: {
          vigente: false,
          fecha_despublicacion: new Date(),
          motivo_despublicacion: dto.motivo_despublicacion,
          FK_usuario_actualizador: usuarioId,
          hora_actualizacion: new Date(),
        },
      });
      if (count === 0) {
        throw new ConflictException(
          'La publicación cambió mientras se procesaba la despublicación; reintentá la operación.',
        );
      }
    });

    return this.findOne(id);
  }

  /**
   * Define o modifica el precio de lista de una publicación vigente (HU-22).
   *
   * - En preparación: guarda el precio y la publicación pasa a Disponible en
   *   la misma transacción (HU-21). Como el precio no se puede quitar, estar
   *   en preparación equivale a no tener precio todavía.
   * - Disponible: solo actualiza el precio; las ventas ya confirmadas tienen
   *   el suyo congelado en su plan de pago.
   * - En Plan de Pago o Vendida: bloqueado (409).
   *
   * Porcentaje de ganancia y margen se guardan como referencia (ver
   * `resolverReferenciaPrecio`). El costo de la unidad nunca se toca: solo
   * se lee para calcular el porcentaje y la advertencia.
   *
   * Lock optimista, mismo criterio que `despublicar`: el `updateMany` lleva
   * en el WHERE el estado leído, así que si una venta o una despublicación
   * cambió la publicación entre la lectura y la escritura, rechaza en vez de
   * pisar el estado nuevo.
   *
   * Devuelve el detalle más `warning` si el precio quedó por debajo del
   * costo: se permite, pero se avisa.
   */
  async definirPrecioLista(
    id: number,
    dto: DefinirPrecioListaDto,
    usuarioId: number,
  ) {
    const warning = await this.prisma.$transaction(async (tx) => {
      const publicacion = await tx.pUBLICACIONUNIDAD.findUnique({
        where: { id_publicacion: id },
        select: {
          vigente: true,
          estado_comercial: true,
          unidadFuncional: { select: { costo: true } },
        },
      });
      if (!publicacion) {
        throw new NotFoundException(`No existe una publicación con id ${id}`);
      }
      if (!publicacion.vigente) {
        throw new ConflictException(
          'La publicación fue despublicada: para definir un precio hay que volver a publicar la unidad.',
        );
      }

      const estadoComercial = publicacion.estado_comercial;
      if (
        estadoComercial === EstadoComercial.EN_PLAN_DE_PAGO ||
        estadoComercial === EstadoComercial.VENDIDA
      ) {
        throw new ConflictException(
          `No se puede modificar el precio de lista: la unidad está ${ESTADO_COMERCIAL_LABELS[estadoComercial]}. Solo puede modificarse en Publicación en preparación o Disponible.`,
        );
      }

      const precioLista = new Prisma.Decimal(dto.precio_lista);
      const costo = publicacion.unidadFuncional.costo;
      const referencia = this.resolverReferenciaPrecio(dto, precioLista, costo);

      const { count } = await tx.pUBLICACIONUNIDAD.updateMany({
        where: {
          id_publicacion: id,
          vigente: true,
          estado_comercial: estadoComercial,
        },
        data: {
          precio_lista: precioLista,
          porcentaje_ganancia: referencia.porcentaje_ganancia,
          margen: referencia.margen,
          FK_usuario_actualizador: usuarioId,
          hora_actualizacion: new Date(),
        },
      });
      if (count === 0) {
        throw new ConflictException(
          'La publicación cambió mientras se guardaba el precio de lista; reintentá la operación.',
        );
      }

      if (estadoComercial === EstadoComercial.EN_PREPARACION) {
        await this.transicionarEstadoComercial(
          tx,
          id,
          EstadoComercial.EN_PREPARACION,
          EstadoComercial.DISPONIBLE,
          usuarioId,
        );
      }

      return advertenciaPrecioMenorAlCosto(
        'El precio de lista',
        precioLista,
        costo,
      );
    });

    return { ...(await this.findOne(id)), warning };
  }

  /**
   * Porcentaje de ganancia y margen que se guardan junto al precio (HU-22).
   *
   * - Si vino alguno de los dos, Comercialización usó la ayuda de cálculo: se
   *   guardan tal cual vinieron (el que no vino queda vacío).
   * - Si no vino ninguno, el precio se cargó directo: se calcula el porcentaje
   *   que representa sobre el costo y el margen queda vacío, para no contar
   *   el mismo ajuste dos veces.
   * - Si además el precio está por debajo del costo, los dos quedan vacíos.
   *
   * El porcentaje calculado es solo de referencia: si no entra en la columna
   * (más de 999,99 %, un precio de más de 11 veces el costo) también queda
   * vacío, en vez de rechazar un precio que es válido.
   */
  private resolverReferenciaPrecio(
    dto: DefinirPrecioListaDto,
    precioLista: Prisma.Decimal,
    costo: Prisma.Decimal,
  ): {
    porcentaje_ganancia: Prisma.Decimal | null;
    margen: Prisma.Decimal | null;
  } {
    const porcentajeIngresado = dto.porcentaje_ganancia ?? null;
    const margenIngresado = dto.margen ?? null;

    if (porcentajeIngresado !== null || margenIngresado !== null) {
      return {
        porcentaje_ganancia:
          porcentajeIngresado === null
            ? null
            : new Prisma.Decimal(porcentajeIngresado),
        margen:
          margenIngresado === null ? null : new Prisma.Decimal(margenIngresado),
      };
    }

    if (precioLista.lessThan(costo)) {
      return { porcentaje_ganancia: null, margen: null };
    }

    const porcentaje = porcentajeGananciaSobreCosto(precioLista, costo);
    return {
      porcentaje_ganancia:
        porcentaje !== null &&
        porcentaje.lessThanOrEqualTo(PORCENTAJE_GANANCIA_MAXIMO)
          ? porcentaje
          : null,
      margen: null,
    };
  }

  /**
   * Mecanismo genérico de transición de `estado_comercial`, sin endpoint
   * propio: lo invocan el precio de lista (T133), la venta (HU-27) y los
   * cobros, cada uno con su propia `$transaction` — este método
   * recibe el `tx` del llamador y nunca abre la suya. Una publicación no
   * vigente no puede transicionar nunca: la condición
   * `vigente: true` va siempre en el `updateMany`.
   */
  async transicionarEstadoComercial(
    tx: Prisma.TransactionClient,
    idPublicacion: number,
    desde: EstadoComercial,
    hacia: EstadoComercial,
    idUsuario: number,
  ): Promise<void> {
    if (!TRANSICIONES_PERMITIDAS[desde]?.includes(hacia)) {
      // Error de programación del llamador (precio, venta o cobro), no un error de
      // usuario: no hay ningún input externo que pueda producir un `desde`/
      // `hacia` fuera del mapa.
      throw new Error(
        `Transición de estado comercial no permitida: ${desde} -> ${hacia}`,
      );
    }

    const { count } = await tx.pUBLICACIONUNIDAD.updateMany({
      where: {
        id_publicacion: idPublicacion,
        vigente: true,
        estado_comercial: desde,
      },
      data: {
        estado_comercial: hacia,
        FK_usuario_actualizador: idUsuario,
        hora_actualizacion: new Date(),
      },
    });
    if (count === 0) {
      throw new ConflictException(
        `La publicación ${idPublicacion} cambió mientras se procesaba la transición; reintentá la operación.`,
      );
    }
  }

  /**
   * Detalle completo: identificador, proyecto, tipología, superficies, piso,
   * comodidades, imágenes y observaciones se leen por relación desde
   * `UNIDADFUNCIONAL` (herencia en vivo), nunca se
   * duplican acá.
   *
   * Nota para T107 (catálogo público): una unidad VENDIDA conserva su
   * publicación vigente para siempre, porque despublicar solo se permite en
   * EN_PREPARACION o DISPONIBLE. Por eso el catálogo público tiene que
   * filtrar por DOS condiciones: `vigente = true` Y
   * `estado_comercial = DISPONIBLE` — filtrar solo por `vigente` mostraría
   * también unidades ya vendidas o en plan de pago.
   */
  async findOne(id: number) {
    const publicacion = await this.prisma.pUBLICACIONUNIDAD.findUnique({
      where: { id_publicacion: id },
      select: PUBLICACION_DETALLE_SELECT,
    });

    if (!publicacion) {
      throw new NotFoundException(`No existe una publicación con id ${id}`);
    }

    return this.mapearDetalle(publicacion);
  }

  private mapearDetalle(publicacion: PublicacionDetalle) {
    const { unidadFuncional, ...cabecera } = publicacion;
    const {
      imagenes,
      proyecto,
      superficie_cubierta,
      superficie_descubierta,
      ...unidadResto
    } = unidadFuncional;
    const { estado_obra, ...proyectoResto } = proyecto;

    return {
      ...cabecera,
      unidad: {
        ...unidadResto,
        superficie_cubierta: superficie_cubierta.toNumber(),
        superficie_descubierta: superficie_descubierta?.toNumber() ?? null,
      },
      imagenes,
      // El contrato HTTP sigue exponiendo `estado`: sale de `estado_obra`.
      proyecto: { ...proyectoResto, estado: estado_obra },
      condicion_entrega: calcularCondicionEntrega(proyecto),
    };
  }

  /**
   * Listado interno paginado, con filtros combinables. Sin filtro de
   * `vigente`, devuelve todas las publicaciones, incluido el historial.
   */
  async findAll(query: QueryPublicacionDto) {
    const { vigente, estado_comercial, FK_proyecto, tipologia, page, limit } =
      query;

    const where: Prisma.PUBLICACIONUNIDADWhereInput = {
      ...(vigente !== undefined && { vigente }),
      ...(estado_comercial !== undefined && { estado_comercial }),
      ...((FK_proyecto !== undefined || tipologia !== undefined) && {
        unidadFuncional: {
          ...(FK_proyecto !== undefined && { FK_proyecto }),
          ...(tipologia !== undefined && { tipologia }),
        },
      }),
    };

    const [publicaciones, total] = await Promise.all([
      this.prisma.pUBLICACIONUNIDAD.findMany({
        where,
        select: {
          id_publicacion: true,
          estado_comercial: true,
          vigente: true,
          precio_lista: true,
          porcentaje_ganancia: true,
          margen: true,
          fecha_publicacion: true,
          fecha_despublicacion: true,
          unidadFuncional: {
            select: {
              id_unidad_funcional: true,
              identificador: true,
              tipologia: true,
              proyecto: {
                select: { id_proyecto: true, codigo: true, nombre: true },
              },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fecha_publicacion: 'desc' },
      }),
      this.prisma.pUBLICACIONUNIDAD.count({ where }),
    ]);

    return {
      data: publicaciones.map((publicacion) => {
        const { unidadFuncional, ...cabecera } = publicacion;
        const { proyecto, ...unidad } = unidadFuncional;
        return { ...cabecera, unidad, proyecto };
      }),
      meta: { total, page, limit },
    };
  }

  /**
   * Unidades publicables para la tabla emergente: activas, de
   * proyecto no cancelado y sin publicación vigente. `publicable: false`
   * marca las de proyecto EN_PLANIFICACION, con el mismo mensaje que rechaza
   * `publicar` (`MOTIVO_PROYECTO_EN_PLANIFICACION`), para que el frontend
   * pueda mostrarlas igual (deshabilitadas) en vez de ocultarlas.
   */
  async findUnidadesPublicables(query: QueryUnidadesPublicablesDto) {
    const { FK_proyecto, tipologia, page, limit } = query;

    const where: Prisma.UNIDADFUNCIONALWhereInput = {
      estado: true,
      proyecto: { estado_obra: { not: EstadoProyecto.CANCELADO } },
      publicaciones: { none: { vigente: true } },
      ...(FK_proyecto !== undefined && { FK_proyecto }),
      ...(tipologia !== undefined && { tipologia }),
    };

    const [unidades, total] = await Promise.all([
      this.prisma.uNIDADFUNCIONAL.findMany({
        where,
        select: {
          id_unidad_funcional: true,
          identificador: true,
          tipologia: true,
          superficie_cubierta: true,
          superficie_descubierta: true,
          piso: true,
          comodidades: true,
          proyecto: {
            select: {
              id_proyecto: true,
              codigo: true,
              nombre: true,
              estado_obra: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id_unidad_funcional: 'asc' },
      }),
      this.prisma.uNIDADFUNCIONAL.count({ where }),
    ]);

    return {
      data: unidades.map((unidad) => {
        const {
          proyecto,
          superficie_cubierta,
          superficie_descubierta,
          ...resto
        } = unidad;
        // El contrato HTTP sigue exponiendo `estado`: sale de `estado_obra`.
        const { estado_obra, ...proyectoResto } = proyecto;
        const publicable = estado_obra !== EstadoProyecto.EN_PLANIFICACION;

        return {
          unidad: {
            ...resto,
            superficie_cubierta: superficie_cubierta.toNumber(),
            superficie_descubierta: superficie_descubierta?.toNumber() ?? null,
          },
          proyecto: { ...proyectoResto, estado: estado_obra },
          publicable,
          motivo_no_publicable: publicable
            ? null
            : MOTIVO_PROYECTO_EN_PLANIFICACION,
        };
      }),
      meta: { total, page, limit },
    };
  }
}
