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
import { CreatePublicacionDto } from './dto/create-publicacion.dto';
import { DespublicarPublicacionDto } from './dto/despublicar-publicacion.dto';
import { QueryPublicacionDto } from './dto/query-publicacion.dto';
import { QueryUnidadesPublicablesDto } from './dto/query-unidades-publicables.dto';

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
  // Se activa el primer plan de pago (T105).
  EN_PREPARACION: [EstadoComercial.DISPONIBLE],
  // Sin plan activo, se inactivan todos los planes (T105); o adhesión (HU-27).
  DISPONIBLE: [EstadoComercial.EN_PREPARACION, EstadoComercial.EN_PLAN_DE_PAGO],
  // Cancelación de la venta, o saldo total en cero.
  EN_PLAN_DE_PAGO: [EstadoComercial.DISPONIBLE, EstadoComercial.VENDIDA],
  // Anulación de un cobro que reabre saldo.
  VENDIDA: [EstadoComercial.EN_PLAN_DE_PAGO],
};

const USUARIO_RESUMEN_SELECT = {
  nombre: true,
  apellido: true,
} as const;

const PROYECTO_RESUMEN_SELECT = {
  id_proyecto: true,
  codigo: true,
  nombre: true,
  localidad: true,
  estado: true,
  fecha_fin_estimada: true,
} as const;

/** Nunca incluye `costo`: es un dato interno de Proyectos. */
const UNIDAD_CON_PROYECTO_E_IMAGENES_SELECT = {
  id_unidad_funcional: true,
  identificador: true,
  tipologia: true,
  superficie_cubierta: true,
  superficie_descubierta: true,
  piso: true,
  comodidades: true,
  observaciones: true,
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
export class PublicacionesService {
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
        Prisma.sql`SELECT "id_unidad_funcional", "estado", "FK_proyecto" FROM "UNIDADFUNCIONAL" WHERE "id_unidad_funcional" = ${dto.id_unidad_funcional} FOR UPDATE`,
      );
      const unidad = filas[0];
      if (!unidad) {
        throw new NotFoundException(
          `No existe una unidad funcional con id ${dto.id_unidad_funcional}`,
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
        select: { estado: true },
      }))!;
      if (proyecto.estado === EstadoProyecto.EN_PLANIFICACION) {
        throw new ConflictException(MOTIVO_PROYECTO_EN_PLANIFICACION);
      }
      if (proyecto.estado === EstadoProyecto.CANCELADO) {
        throw new ConflictException(
          'No se puede publicar la unidad: su proyecto fue cancelado.',
        );
      }

      const publicacionVigente = await tx.pUBLICACIONUNIDAD.findFirst({
        where: { FK_unidad_funcional: dto.id_unidad_funcional, vigente: true },
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
          FK_unidad_funcional: dto.id_unidad_funcional,
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
          motivo_despublicacion: dto.motivo,
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
   * Mecanismo genérico de transición de `estado_comercial`, sin endpoint
   * propio: lo invocan T105 (activar/inactivar según los planes) y la
   * adhesión de HU-27, cada uno con su propia `$transaction` — este método
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
      // Error de programación del llamador (T105 / adhesión), no un error de
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

    return {
      ...cabecera,
      unidad: {
        ...unidadResto,
        superficie_cubierta: superficie_cubierta.toNumber(),
        superficie_descubierta: superficie_descubierta?.toNumber() ?? null,
      },
      imagenes,
      proyecto,
      condicion_entrega: calcularCondicionEntrega(proyecto),
    };
  }

  /**
   * Listado interno paginado, con filtros combinables. Sin filtro de
   * `vigente`, devuelve todas las publicaciones, incluido el historial.
   */
  async findAll(query: QueryPublicacionDto) {
    const { vigente, estado_comercial, id_proyecto, tipologia, page, limit } =
      query;

    const where: Prisma.PUBLICACIONUNIDADWhereInput = {
      ...(vigente !== undefined && { vigente }),
      ...(estado_comercial !== undefined && { estado_comercial }),
      ...((id_proyecto !== undefined || tipologia !== undefined) && {
        unidadFuncional: {
          ...(id_proyecto !== undefined && { FK_proyecto: id_proyecto }),
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
    const { id_proyecto, tipologia, page, limit } = query;

    const where: Prisma.UNIDADFUNCIONALWhereInput = {
      estado: true,
      proyecto: { estado: { not: EstadoProyecto.CANCELADO } },
      publicaciones: { none: { vigente: true } },
      ...(id_proyecto !== undefined && { FK_proyecto: id_proyecto }),
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
              estado: true,
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
        const publicable = proyecto.estado !== EstadoProyecto.EN_PLANIFICACION;

        return {
          unidad: {
            ...resto,
            superficie_cubierta: superficie_cubierta.toNumber(),
            superficie_descubierta: superficie_descubierta?.toNumber() ?? null,
          },
          proyecto,
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
