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
import { ESTADO_PROYECTO_LABELS } from '../../proyectos/proyecto.service';
import { CreateUnidadFuncionalDto } from './dto/create-unidad-funcional.dto';
import { UpdateUnidadFuncionalDto } from './dto/update-unidad-funcional.dto';
import { QueryUnidadFuncionalDto } from './dto/query-unidad-funcional.dto';
import { CreateImagenUnidadDto } from './dto/create-imagen-unidad.dto';
import { OrdenarImagenesUnidadDto } from './dto/ordenar-imagenes-unidad.dto';
import type { EstadoComercialUnidad } from './dto/estado-comercial-unidad';
import { USUARIO_RESUMEN_SELECT } from '../../../common/selects/usuario-resumen.select';

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

/** Estado comercial de la unidad que no tiene ninguna publicación vigente. */
const ESTADO_COMERCIAL_SIN_PUBLICAR = 'SIN_PUBLICAR';

const MOTIVO_BAJA_PUBLICACION_VIGENTE =
  'tiene una publicación vigente en el ecommerce (primero hay que despublicarla)';

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
      estado_obra: true,
      fecha_fin_estimada: true,
    },
  },
  // Cualquier publicación, vigente o histórica: alcanza para congelar el
  // costo. No hay columna que lo marque, se deriva de esta cuenta.
  _count: { select: { publicaciones: true } },
  // A lo sumo una vigente por unidad: de ella sale el estado comercial.
  publicaciones: {
    where: { vigente: true },
    select: { estado_comercial: true },
    take: 1,
  },
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
   * Alta de una unidad. Solo con el proyecto activo y En planificación, sin
   * superar las unidades planificadas del proyecto, y con el identificador
   * libre entre las unidades activas de ese proyecto. La auditoría sale del
   * usuario autenticado, nunca del body.
   */
  async create(dto: CreateUnidadFuncionalDto, usuarioId: number) {
    const idUnidad = await this.prisma.$transaction(async (tx) => {
      await this.validarProyectoAdmiteAltas(tx, dto.FK_proyecto);
      await this.validarIdentificadorUnico(
        tx,
        dto.FK_proyecto,
        dto.identificador,
      );

      const { id_unidad_funcional } = await tx.uNIDADFUNCIONAL.create({
        data: {
          ...dto,
          FK_usuario_creador: usuarioId,
          FK_usuario_actualizador: usuarioId,
        },
        select: { id_unidad_funcional: true },
      });
      return id_unidad_funcional;
    });

    return this.findOne(idUnidad);
  }

  /**
   * Listado paginado con filtros combinables por proyecto, tipología, estado
   * comercial y rango de superficie cubierta. Sin filtro de `estado`, solo las
   * activas. Orden por defecto: por proyecto y, dentro de cada uno, en el
   * orden de carga.
   */
  async findAll(query: QueryUnidadFuncionalDto) {
    const {
      FK_proyecto,
      tipologia,
      estado_comercial,
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
      ...(estado_comercial && {
        publicaciones:
          estado_comercial === ESTADO_COMERCIAL_SIN_PUBLICAR
            ? { none: { vigente: true } }
            : { some: { vigente: true, estado_comercial } },
      }),
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
   *
   * Toma dos locks de fila, en este orden: la UNIDAD y después su PROYECTO.
   * El del proyecto es el mismo que toma `ProyectoService` al avanzar el
   * estado de obra: sin él, pasar a En ejecución y dar de baja la última
   * unidad activa podían validar a la vez, cada una con el dato viejo de la
   * otra, y dejar un proyecto En ejecución sin unidades activas. Con el lock,
   * la que llega segunda espera y recién después lee lo que la otra dejó
   * commiteado.
   */
  async baja(id: number, usuarioId: number) {
    await this.prisma.$transaction(async (tx) => {
      const unidad = await this.bloquearUnidad(tx, id);

      if (!unidad.estado) {
        throw new ConflictException('La unidad ya está dada de baja');
      }

      // El lock del proyecto se pide DESPUÉS de saber que la unidad está
      // activa, a propósito: `activar` lo toma en el orden inverso (proyecto y
      // después el UPDATE de la unidad), pero solo sobre una unidad dada de
      // baja, así que una baja y una reactivación de la misma unidad no llegan
      // a esperarse mutuamente. `ProyectoService` cuenta las unidades activas
      // con un `count`, sin locks de fila, y `PublicacionService.publicar` no
      // toma el lock del proyecto: ninguno de los dos invierte el orden.
      //
      // El estado de obra sale de acá y no de `unidad.proyecto`: ese se leyó
      // antes de tener el lock y puede ser el valor viejo.
      const proyecto = await this.bloquearProyecto(tx, unidad.FK_proyecto);
      this.validarProyectoNoCancelado(proyecto.estado_obra);

      const motivos: string[] = [];

      const publicacionVigente = await tx.pUBLICACIONUNIDAD.findFirst({
        where: { FK_unidad_funcional: id, vigente: true },
        select: { id_publicacion: true },
      });
      if (publicacionVigente) {
        motivos.push(MOTIVO_BAJA_PUBLICACION_VIGENTE);
      }

      if (
        proyecto.estado_obra === EstadoProyecto.EN_EJECUCION ||
        proyecto.estado_obra === EstadoProyecto.FINALIZADO
      ) {
        motivos.push(
          `su proyecto está ${ESTADO_PROYECTO_LABELS[proyecto.estado_obra]} (con el proyecto en ejecución o finalizado solo se pueden editar las características descriptivas)`,
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
   * que un alta nueva — proyecto activo y En planificación, sin superar las
   * unidades planificadas, e identificador todavía libre entre las activas
   * (mientras estuvo de baja, otra unidad pudo haberlo tomado).
   */
  async activar(id: number, usuarioId: number) {
    await this.prisma.$transaction(async (tx) => {
      const unidad = await tx.uNIDADFUNCIONAL.findUnique({
        where: { id_unidad_funcional: id },
        select: { FK_proyecto: true, identificador: true, estado: true },
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
          await this.validarProyectoAdmiteAltas(tx, unidad.FK_proyecto);
          await this.validarIdentificadorUnico(
            tx,
            unidad.FK_proyecto,
            unidad.identificador,
            id,
          );
        },
        activar: () =>
          tx.uNIDADFUNCIONAL.update({
            where: { id_unidad_funcional: id },
            data: {
              estado: true,
              FK_usuario_actualizador: usuarioId,
              hora_actualizacion: new Date(),
            },
          }),
      });
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
        proyecto: { select: { estado_obra: true } },
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

  /**
   * Toma el lock de la fila del proyecto (`SELECT ... FOR UPDATE`), el mismo
   * que `ProyectoService.bloquearProyecto`, y lo retiene hasta el final de la
   * transacción. Devuelve lo que las reglas de las unidades necesitan mirar
   * del proyecto, leído DESPUÉS de tener el lock: si otra transacción lo
   * estaba modificando, el `FOR UPDATE` espera a que termine y el
   * `findUnique` ya ve lo que dejó commiteado.
   */
  private async bloquearProyecto(
    tx: Prisma.TransactionClient,
    idProyecto: number,
  ) {
    const filas = await tx.$queryRaw<{ id_proyecto: number }[]>(
      Prisma.sql`SELECT "id_proyecto" FROM "PROYECTO" WHERE "id_proyecto" = ${idProyecto} FOR UPDATE`,
    );
    if (filas.length === 0) {
      throw new NotFoundException(`No existe un proyecto con id ${idProyecto}`);
    }

    // La fila acaba de bloquearse: existe.
    return (await tx.pROYECTO.findUnique({
      where: { id_proyecto: idProyecto },
      select: {
        estado: true,
        estado_obra: true,
        cantidad_unidades_planificadas: true,
      },
    }))!;
  }

  /**
   * Condiciones del PROYECTO para sumar una unidad activa, sea por un alta o
   * por una reactivación: que exista, esté activo (HU-31), esté En
   * planificación y no tenga ya tantas unidades activas como planificó.
   *
   * Valida con el lock del proyecto tomado (ver `bloquearProyecto`): sin él,
   * dos altas simultáneas contarían las mismas unidades activas y las dos
   * pasarían el límite. Es el mismo lock que toma `ProyectoService` al editar
   * las planificadas, así que tampoco se puede bajar esa cantidad justo
   * mientras se carga una unidad.
   */
  private async validarProyectoAdmiteAltas(
    tx: Prisma.TransactionClient,
    idProyecto: number,
  ) {
    const proyecto = await this.bloquearProyecto(tx, idProyecto);

    if (!proyecto.estado) {
      throw new ConflictException(
        'No se pueden dar de alta unidades: el proyecto está dado de baja.',
      );
    }
    if (proyecto.estado_obra !== EstadoProyecto.EN_PLANIFICACION) {
      throw new ConflictException(
        `No se pueden dar de alta unidades: el proyecto está ${ESTADO_PROYECTO_LABELS[proyecto.estado_obra]}. Solo se pueden cargar unidades mientras el proyecto está En planificación.`,
      );
    }

    const activas = await tx.uNIDADFUNCIONAL.count({
      where: { FK_proyecto: idProyecto, estado: true },
    });
    if (activas >= proyecto.cantidad_unidades_planificadas) {
      throw new ConflictException(
        `No se pueden dar de alta más unidades: el proyecto ya tiene ${activas} unidad(es) activa(s) de las ${proyecto.cantidad_unidades_planificadas} planificada(s). Primero hay que actualizar la cantidad de unidades planificadas en el proyecto.`,
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
    proyecto: { estado_obra: EstadoProyecto };
  }) {
    if (!unidad.estado) {
      throw new ConflictException(
        'La unidad está dada de baja: primero hay que reactivarla.',
      );
    }
    this.validarProyectoNoCancelado(unidad.proyecto.estado_obra);
  }
}

/**
 * Pasa los importes de Decimal a número y deriva `costo_editable`, el estado
 * comercial y la condición de entrega (ninguno de los tres se persiste).
 * Sirve tanto para el listado como para el detalle: lo que el detalle trae de
 * más pasa tal cual.
 */
function mapearListado<T extends UnidadListado>(unidad: T) {
  const {
    superficie_cubierta,
    superficie_descubierta,
    costo,
    _count,
    proyecto,
    publicaciones,
    ...resto
  } = unidad;
  // El contrato HTTP sigue exponiendo `estado`: sale de `estado_obra`.
  const { estado_obra, ...proyectoResto } = proyecto;

  return {
    ...resto,
    proyecto: { ...proyectoResto, estado: estado_obra },
    superficie_cubierta: superficie_cubierta.toNumber(),
    superficie_descubierta: superficie_descubierta?.toNumber() ?? null,
    costo: costo.toNumber(),
    estado_comercial: (publicaciones[0]?.estado_comercial ??
      ESTADO_COMERCIAL_SIN_PUBLICAR) satisfies EstadoComercialUnidad,
    costo_editable: _count.publicaciones === 0,
    condicion_entrega: calcularCondicionEntrega(proyecto),
  };
}

function mapearDetalle(unidad: UnidadDetalle) {
  return {
    ...mapearListado(unidad),
    motivo_costo_no_editable:
      unidad._count.publicaciones === 0 ? null : MOTIVO_COSTO_CONGELADO,
  };
}
