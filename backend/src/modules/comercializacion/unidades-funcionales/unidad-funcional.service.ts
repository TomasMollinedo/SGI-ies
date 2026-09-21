import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import {
  EstadoProyecto,
  TipologiaUnidad,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { CatalogoItemDto } from '../../../common/dto/catalogo-item.dto';
import { validarNombreUnicoEntreActivos } from '../../../common/validaciones/nombre-unico-entre-activos';
import { reactivarEntidad } from '../../../common/validaciones/reactivar-entidad';
import { calcularCondicionEntrega } from '../common/condicion-entrega';
import { ESTADO_PROYECTO_LABELS } from './proyecto.service';
import { CreateUnidadFuncionalDto } from './dto/create-unidad-funcional.dto';
import { UpdateUnidadFuncionalDto } from './dto/update-unidad-funcional.dto';
import { QueryUnidadFuncionalDto } from './dto/query-unidad-funcional.dto';
import { CreateImagenUnidadDto } from './dto/create-imagen-unidad.dto';
import { OrdenarImagenesUnidadDto } from './dto/ordenar-imagenes-unidad.dto';

/**
 * Etiquetas legibles de `TipologiaUnidad` para el catálogo que consume el
 * `<select>` del frontend (ver `findTipologias`).
 */
const TIPOLOGIA_LABELS: Record<TipologiaUnidad, string> = {
  MONOAMBIENTE: 'Monoambiente',
  UN_DORMITORIO: '1 dormitorio',
  DOS_DORMITORIOS: '2 dormitorios',
  TRES_DORMITORIOS: '3 dormitorios',
  LOCAL_COMERCIAL: 'Local comercial',
  COCHERA: 'Cochera',
  OTRO: 'Otro',
};

/**
 * Se rechaza la edición del costo con este texto y el mismo se devuelve como
 * `motivo_costo_no_editable`, para que el frontend lo muestre junto al campo
 * deshabilitado sin esperar a que el usuario intente guardar.
 */
const MOTIVO_COSTO_CONGELADO =
  'El costo ya no se puede modificar: la unidad tiene (o tuvo) una publicación en el ecommerce. Cualquier ajuste sobre lo que paga el cliente se hace desde el margen de Comercialización, nunca sobre el costo.';

const MOTIVO_BAJA_PUBLICACION_VIGENTE =
  'tiene una publicación vigente en el ecommerce (primero hay que despublicarla)';

const USUARIO_RESUMEN_SELECT = {
  nombre: true,
  apellido: true,
} satisfies Prisma.USUARIOSelect;

const UNIDAD_LISTADO_SELECT = {
  id_unidad_funcional: true,
  FK_proyecto: true,
  identificador: true,
  tipologia: true,
  superficie_cubierta: true,
  superficie_descubierta: true,
  piso: true,
  comodidades: true,
  observaciones: true,
  costo: true,
  estado: true,
  proyecto: {
    select: {
      id_proyecto: true,
      codigo: true,
      nombre: true,
      estado: true,
      fecha_fin_estimada: true,
    },
  },
  // Cualquier publicación, vigente o histórica: alcanza para congelar el
  // costo. No hay columna que lo marque, se deriva de esta cuenta.
  _count: { select: { publicaciones: true } },
} satisfies Prisma.UNIDADFUNCIONALSelect;

const UNIDAD_DETALLE_SELECT = {
  ...UNIDAD_LISTADO_SELECT,
  hora_creacion: true,
  hora_actualizacion: true,
  FK_usuario_creador: true,
  FK_usuario_actualizador: true,
  usuarioCreador: { select: USUARIO_RESUMEN_SELECT },
  usuarioActualizador: { select: USUARIO_RESUMEN_SELECT },
  imagenes: {
    select: { id_imagen_unidad: true, url: true, orden: true },
    // El id desempata dos imágenes con el mismo `orden`: la galería siempre
    // sale en el mismo orden.
    orderBy: [{ orden: 'asc' }, { id_imagen_unidad: 'asc' }],
  },
} satisfies Prisma.UNIDADFUNCIONALSelect;

type UnidadListado = Prisma.UNIDADFUNCIONALGetPayload<{
  select: typeof UNIDAD_LISTADO_SELECT;
}>;
type UnidadDetalle = Prisma.UNIDADFUNCIONALGetPayload<{
  select: typeof UNIDAD_DETALLE_SELECT;
}>;

@Injectable()
export class UnidadFuncionalService {
  constructor(private readonly prisma: PrismaService) {}

  /** Catálogo de tipologías para poblar el `<select>` del frontend. */
  findTipologias(): CatalogoItemDto[] {
    return Object.entries(TIPOLOGIA_LABELS).map(([id, code]) => ({
      id,
      code,
      metadata: {},
    }));
  }

  /**
   * Alta de una unidad. Solo con el proyecto En planificación, y con el
   * identificador libre entre las unidades activas de ese proyecto. La
   * auditoría sale del usuario autenticado, nunca del body.
   */
  async create(dto: CreateUnidadFuncionalDto, usuarioId: number) {
    const proyecto = await this.prisma.pROYECTO.findUnique({
      where: { id_proyecto: dto.FK_proyecto },
      select: { estado: true },
    });
    if (!proyecto) {
      throw new NotFoundException(
        `No existe un proyecto con id ${dto.FK_proyecto}`,
      );
    }

    this.validarProyectoAdmiteAltas(proyecto.estado);
    await this.validarIdentificadorUnico(
      this.prisma,
      dto.FK_proyecto,
      dto.identificador,
    );

    const { id_unidad_funcional } = await this.prisma.uNIDADFUNCIONAL.create({
      data: {
        ...dto,
        FK_usuario_creador: usuarioId,
        FK_usuario_actualizador: usuarioId,
      },
      select: { id_unidad_funcional: true },
    });

    return this.findOne(id_unidad_funcional);
  }

  /**
   * Listado paginado con filtros combinables por proyecto, tipología y rango
   * de superficie cubierta. Sin filtro de `estado`, solo las activas. Orden
   * por defecto: por proyecto y, dentro de cada uno, en el orden de carga.
   */
  async findAll(query: QueryUnidadFuncionalDto) {
    const {
      FK_proyecto,
      tipologia,
      superficie_min,
      superficie_max,
      estado,
      page,
      limit,
    } = query;

    const filtroEstado =
      estado === undefined ? true : estado === 'todos' ? undefined : estado;

    const where: Prisma.UNIDADFUNCIONALWhereInput = {
      ...(filtroEstado !== undefined && { estado: filtroEstado }),
      ...(FK_proyecto !== undefined && { FK_proyecto }),
      ...(tipologia && { tipologia }),
      ...((superficie_min !== undefined || superficie_max !== undefined) && {
        superficie_cubierta: {
          ...(superficie_min !== undefined && { gte: superficie_min }),
          ...(superficie_max !== undefined && { lte: superficie_max }),
        },
      }),
    };

    const [unidades, total] = await Promise.all([
      this.prisma.uNIDADFUNCIONAL.findMany({
        where,
        select: UNIDAD_LISTADO_SELECT,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ FK_proyecto: 'asc' }, { id_unidad_funcional: 'asc' }],
      }),
      this.prisma.uNIDADFUNCIONAL.count({ where }),
    ]);

    return {
      data: unidades.map((unidad) => mapearListado(unidad)),
      meta: { total, page, limit },
    };
  }

  /** Detalle de una unidad (modo lectura), con su galería y su auditoría. */
  async findOne(id: number) {
    const unidad = await this.prisma.uNIDADFUNCIONAL.findUnique({
      where: { id_unidad_funcional: id },
      select: UNIDAD_DETALLE_SELECT,
    });

    if (!unidad) {
      throw new NotFoundException(
        `No existe una unidad funcional con id ${id}`,
      );
    }

    return mapearDetalle(unidad);
  }

  /**
   * Edición. Las características descriptivas se pueden editar con el
   * proyecto En planificación, En ejecución o Finalizado. El costo, en
   * cambio, solo mientras la unidad no tenga ninguna publicación (vigente o
   * histórica): después queda fijo para siempre.
   */
  async update(id: number, dto: UpdateUnidadFuncionalDto, usuarioId: number) {
    await this.prisma.$transaction(async (tx) => {
      const unidad = await this.bloquearUnidad(tx, id);
      this.validarEditable(unidad);

      if (
        dto.identificador !== undefined &&
        dto.identificador !== unidad.identificador
      ) {
        await this.validarIdentificadorUnico(
          tx,
          unidad.FK_proyecto,
          dto.identificador,
          id,
        );
      }

      // Solo se rechaza si el costo CAMBIA: un formulario que reenvía el costo
      // deshabilitado, sin tocarlo, no tiene por qué fallar.
      if (
        dto.costo !== undefined &&
        !unidad.costo.equals(dto.costo) &&
        unidad._count.publicaciones > 0
      ) {
        throw new ConflictException(MOTIVO_COSTO_CONGELADO);
      }

      await tx.uNIDADFUNCIONAL.update({
        where: { id_unidad_funcional: id },
        data: {
          ...dto,
          FK_usuario_actualizador: usuarioId,
          hora_actualizacion: new Date(),
        },
      });
    });

    return this.findOne(id);
  }

  /**
   * Baja lógica. Hay dos motivos distintos por los que se rechaza, y el
   * mensaje dice cuál (o los dos juntos, si se dan a la vez): la unidad tiene
   * una publicación vigente en el ecommerce, o su proyecto está En ejecución
   * o Finalizado.
   */
  async baja(id: number, usuarioId: number) {
    await this.prisma.$transaction(async (tx) => {
      const unidad = await this.bloquearUnidad(tx, id);

      if (!unidad.estado) {
        throw new ConflictException('La unidad ya está dada de baja');
      }
      this.validarProyectoNoCancelado(unidad.proyecto.estado);

      const motivos: string[] = [];

      const publicacionVigente = await tx.pUBLICACIONUNIDAD.findFirst({
        where: { FK_unidad_funcional: id, vigente: true },
        select: { id_publicacion: true },
      });
      if (publicacionVigente) {
        motivos.push(MOTIVO_BAJA_PUBLICACION_VIGENTE);
      }

      if (
        unidad.proyecto.estado === EstadoProyecto.EN_EJECUCION ||
        unidad.proyecto.estado === EstadoProyecto.FINALIZADO
      ) {
        motivos.push(
          `su proyecto está ${ESTADO_PROYECTO_LABELS[unidad.proyecto.estado]} (con el proyecto en ejecución o finalizado solo se pueden editar las características descriptivas)`,
        );
      }

      if (motivos.length > 0) {
        throw new ConflictException(
          `No se puede dar de baja la unidad: ${motivos.join(' y ')}.`,
        );
      }

      await tx.uNIDADFUNCIONAL.update({
        where: { id_unidad_funcional: id },
        data: {
          estado: false,
          FK_usuario_actualizador: usuarioId,
          hora_actualizacion: new Date(),
        },
      });
    });

    return this.findOne(id);
  }

  /**
   * Alta lógica (reactivar): solo si está de baja, con las mismas condiciones
   * que un alta nueva — proyecto En planificación e identificador todavía
   * libre entre las activas (mientras estuvo de baja, otra unidad pudo
   * haberlo tomado).
   */
  async activar(id: number, usuarioId: number) {
    const unidad = await this.prisma.uNIDADFUNCIONAL.findUnique({
      where: { id_unidad_funcional: id },
      select: {
        FK_proyecto: true,
        identificador: true,
        estado: true,
        proyecto: { select: { estado: true } },
      },
    });
    if (!unidad) {
      throw new NotFoundException(
        `No existe una unidad funcional con id ${id}`,
      );
    }

    await reactivarEntidad({
      entidad: unidad,
      entidadYaActiva: 'La unidad ya está activa',
      revalidar: async () => {
        this.validarProyectoAdmiteAltas(unidad.proyecto.estado);
        await this.validarIdentificadorUnico(
          this.prisma,
          unidad.FK_proyecto,
          unidad.identificador,
          id,
        );
      },
      activar: () =>
        this.prisma.uNIDADFUNCIONAL.update({
          where: { id_unidad_funcional: id },
          data: {
            estado: true,
            FK_usuario_actualizador: usuarioId,
            hora_actualizacion: new Date(),
          },
        }),
    });

    return this.findOne(id);
  }

  /**
   * Suma una imagen a la galería. Solo persiste la URL que devolvió
   * POST /almacenamiento/imagenes y su orden; sin `orden`, va al final.
   */
  async agregarImagen(
    id: number,
    dto: CreateImagenUnidadDto,
    usuarioId: number,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const unidad = await this.bloquearUnidad(tx, id);
      this.validarEditable(unidad);

      let orden = dto.orden;
      if (orden === undefined) {
        const { _max } = await tx.iMAGENUNIDAD.aggregate({
          where: { FK_unidad_funcional: id },
          _max: { orden: true },
        });
        orden = (_max.orden ?? -1) + 1;
      }

      await tx.iMAGENUNIDAD.create({
        data: { FK_unidad_funcional: id, url: dto.url, orden },
      });
      await this.registrarAuditoria(tx, id, usuarioId);
    });

    return this.findOne(id);
  }

  /**
   * Quita una imagen de la galería. Borrado físico: una imagen no es
   * historial financiero ni contractual (el archivo queda en el
   * almacenamiento de objetos, que no tiene borrado).
   */
  async quitarImagen(id: number, idImagen: number, usuarioId: number) {
    await this.prisma.$transaction(async (tx) => {
      const unidad = await this.bloquearUnidad(tx, id);
      this.validarEditable(unidad);

      const { count } = await tx.iMAGENUNIDAD.deleteMany({
        where: { id_imagen_unidad: idImagen, FK_unidad_funcional: id },
      });
      if (count === 0) {
        throw new NotFoundException(
          `No existe una imagen con id ${idImagen} en la unidad ${id}`,
        );
      }
      await this.registrarAuditoria(tx, id, usuarioId);
    });

    return this.findOne(id);
  }

  /**
   * Reordena la galería: recibe TODAS las imágenes de la unidad en el orden
   * nuevo y deja cada una con `orden` igual a su posición (desde 0).
   */
  async ordenarImagenes(
    id: number,
    dto: OrdenarImagenesUnidadDto,
    usuarioId: number,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const unidad = await this.bloquearUnidad(tx, id);
      this.validarEditable(unidad);

      const actuales = await tx.iMAGENUNIDAD.findMany({
        where: { FK_unidad_funcional: id },
        select: { id_imagen_unidad: true },
      });
      const idsActuales = new Set(actuales.map((i) => i.id_imagen_unidad));
      const idsNuevos = dto.ids_imagen_unidad;

      if (
        idsNuevos.length !== idsActuales.size ||
        idsNuevos.some((idImagen) => !idsActuales.has(idImagen))
      ) {
        throw new BadRequestException(
          'La lista debe incluir exactamente las imágenes actuales de la unidad, cada una una sola vez',
        );
      }

      for (const [orden, idImagen] of idsNuevos.entries()) {
        await tx.iMAGENUNIDAD.update({
          where: { id_imagen_unidad: idImagen },
          data: { orden },
        });
      }
      await this.registrarAuditoria(tx, id, usuarioId);
    });

    return this.findOne(id);
  }

  /**
   * Toma el lock de la fila (`SELECT ... FOR UPDATE`), igual que
   * PublicacionService.publicar: serializa la edición, la baja y las imágenes
   * contra una publicación concurrente, así no se puede dar de baja (ni
   * cambiar el costo de) una unidad justo mientras se publica por primera vez.
   */
  private async bloquearUnidad(tx: Prisma.TransactionClient, id: number) {
    const filas = await tx.$queryRaw<{ id_unidad_funcional: number }[]>(
      Prisma.sql`SELECT "id_unidad_funcional" FROM "UNIDADFUNCIONAL" WHERE "id_unidad_funcional" = ${id} FOR UPDATE`,
    );
    if (filas.length === 0) {
      throw new NotFoundException(
        `No existe una unidad funcional con id ${id}`,
      );
    }

    // La fila acaba de bloquearse: existe.
    return (await tx.uNIDADFUNCIONAL.findUnique({
      where: { id_unidad_funcional: id },
      select: {
        FK_proyecto: true,
        identificador: true,
        costo: true,
        estado: true,
        proyecto: { select: { estado: true } },
        _count: { select: { publicaciones: true } },
      },
    }))!;
  }

  /** Las operaciones de imágenes no tocan la unidad, pero igual quedan auditadas en ella. */
  private async registrarAuditoria(
    tx: Prisma.TransactionClient,
    id: number,
    usuarioId: number,
  ) {
    await tx.uNIDADFUNCIONAL.update({
      where: { id_unidad_funcional: id },
      data: {
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * El identificador es único solo entre las unidades ACTIVAS del MISMO
   * proyecto: el mismo identificador en otro proyecto, o el de una unidad
   * dada de baja, es válido. Se valida acá y no con una restricción de base.
   */
  private async validarIdentificadorUnico(
    cliente: Prisma.TransactionClient,
    idProyecto: number,
    identificador: string,
    idExcluido?: number,
  ) {
    await validarNombreUnicoEntreActivos({
      entidadActiva: 'una unidad activa en este proyecto',
      nombre: identificador,
      existeOtroActivo: () =>
        cliente.uNIDADFUNCIONAL
          .findFirst({
            where: {
              FK_proyecto: idProyecto,
              identificador: { equals: identificador, mode: 'insensitive' },
              estado: true,
              ...(idExcluido !== undefined && {
                id_unidad_funcional: { not: idExcluido },
              }),
            },
            select: { id_unidad_funcional: true },
          })
          .then((unidad) => unidad !== null),
    });
  }

  private validarProyectoAdmiteAltas(estado: EstadoProyecto) {
    if (estado !== EstadoProyecto.EN_PLANIFICACION) {
      throw new ConflictException(
        `No se pueden dar de alta unidades: el proyecto está ${ESTADO_PROYECTO_LABELS[estado]}. Solo se pueden cargar unidades mientras el proyecto está En planificación.`,
      );
    }
  }

  private validarProyectoNoCancelado(estado: EstadoProyecto) {
    if (estado === EstadoProyecto.CANCELADO) {
      throw new ConflictException(
        'No se puede modificar la unidad: su proyecto está Cancelado.',
      );
    }
  }

  private validarEditable(unidad: {
    estado: boolean;
    proyecto: { estado: EstadoProyecto };
  }) {
    if (!unidad.estado) {
      throw new ConflictException(
        'La unidad está dada de baja: primero hay que reactivarla.',
      );
    }
    this.validarProyectoNoCancelado(unidad.proyecto.estado);
  }
}

/**
 * Pasa los importes de Decimal a número y deriva `costo_editable` y la
 * condición de entrega (ninguno de los dos se persiste). Sirve tanto para el
 * listado como para el detalle: lo que el detalle trae de más pasa tal cual.
 */
function mapearListado<T extends UnidadListado>(unidad: T) {
  const {
    superficie_cubierta,
    superficie_descubierta,
    costo,
    _count,
    ...resto
  } = unidad;

  return {
    ...resto,
    superficie_cubierta: superficie_cubierta.toNumber(),
    superficie_descubierta: superficie_descubierta?.toNumber() ?? null,
    costo: costo.toNumber(),
    costo_editable: _count.publicaciones === 0,
    condicion_entrega: calcularCondicionEntrega(unidad.proyecto),
  };
}

function mapearDetalle(unidad: UnidadDetalle) {
  return {
    ...mapearListado(unidad),
    motivo_costo_no_editable:
      unidad._count.publicaciones === 0 ? null : MOTIVO_COSTO_CONGELADO,
  };
}
