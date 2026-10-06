import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { EstadoProyecto } from '../../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { CatalogoItemDto } from '../../common/dto/catalogo-item.dto';
import { condicionBusquedaPorPalabras } from '../../common/validaciones/busqueda-por-palabras';
import { validarNombreUnicoEntreActivos } from '../../common/validaciones/nombre-unico-entre-activos';
import { QueryProyectoDto } from './dto/query-proyecto.dto';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { CambiarEstadoObraDto } from './dto/cambiar-estado-obra.dto';
import { CreateImagenProyectoDto } from './dto/create-imagen-proyecto.dto';
import { OrdenarImagenesProyectoDto } from './dto/ordenar-imagenes-proyecto.dto';

/**
 * Etiquetas legibles de `EstadoProyecto`: las usa el catálogo del `<select>`
 * (ver `findEstados`) y `UnidadFuncionalService` para armar sus mensajes de
 * rechazo, para que el texto no quede desincronizado entre los dos.
 */
export const ESTADO_PROYECTO_LABELS: Record<EstadoProyecto, string> = {
  EN_PLANIFICACION: 'En planificación',
  EN_EJECUCION: 'En ejecución',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

/**
 * El único avance posible desde cada estado de obra (HU-31): no hay saltos ni
 * retrocesos. Finalizado y Cancelado no tienen siguiente.
 */
const SIGUIENTE_ESTADO_OBRA: Partial<Record<EstadoProyecto, EstadoProyecto>> = {
  EN_PLANIFICACION: EstadoProyecto.EN_EJECUCION,
  EN_EJECUCION: EstadoProyecto.FINALIZADO,
};

const USUARIO_RESUMEN_SELECT = {
  nombre: true,
  apellido: true,
} satisfies Prisma.USUARIOSelect;

const PROYECTO_SELECT = {
  id_proyecto: true,
  codigo: true,
  nombre: true,
  descripcion: true,
  localidad: true,
  direccion: true,
  fecha_inicio: true,
  fecha_fin_estimada: true,
  estado_obra: true,
  estado: true,
  cantidad_unidades_planificadas: true,
  imagen_portada_url: true,
} satisfies Prisma.PROYECTOSelect;

const PROYECTO_DETALLE_SELECT = {
  ...PROYECTO_SELECT,
  hora_creacion: true,
  hora_actualizacion: true,
  FK_usuario_creador: true,
  FK_usuario_actualizador: true,
  usuarioCreador: { select: USUARIO_RESUMEN_SELECT },
  usuarioActualizador: { select: USUARIO_RESUMEN_SELECT },
  imagenes: {
    select: { id_imagen_proyecto: true, url: true, tipo: true, orden: true },
    // El id desempata dos imágenes con el mismo `orden`: la galería siempre
    // sale en el mismo orden.
    orderBy: [{ orden: 'asc' }, { id_imagen_proyecto: 'asc' }],
  },
} satisfies Prisma.PROYECTOSelect;

type ProyectoBase = Prisma.PROYECTOGetPayload<{
  select: typeof PROYECTO_SELECT;
}>;

interface ResumenUnidades {
  cargadas: number;
  presupuesto: number;
}

/** Lo que devuelve `bloquearProyecto`: lo que las reglas de escritura necesitan mirar. */
interface ProyectoBloqueado {
  estado: boolean;
  estado_obra: EstadoProyecto;
  fecha_inicio: Date | null;
  fecha_fin_estimada: Date | null;
}

/**
 * ABM de Proyecto (HU-31): alta, edición, avance del estado de obra, baja
 * lógica y galería de imágenes de diseño, además del listado y el detalle
 * que ya consumían HU-20 y HU-25. `presupuesto` y `unidades_cargadas` se
 * calculan al leer, a partir de las unidades funcionales activas.
 */
@Injectable()
export class ProyectoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Catálogo de estados de obra para poblar el `<select>` del frontend.
   * Incluye Cancelado aunque no sea destino de ningún cambio de estado:
   * existen proyectos cancelados, y el listado los muestra y los filtra.
   */
  findEstados(): CatalogoItemDto[] {
    return Object.entries(ESTADO_PROYECTO_LABELS).map(([id, code]) => ({
      id,
      code,
      metadata: {},
    }));
  }

  /**
   * Catálogo de localidades para el filtro del listado: las que ya están
   * cargadas en los proyectos activos (`id` = `code` = la localidad).
   *
   * Respuesta PROVISORIA a OBS-23: la localidad es texto libre, así que no
   * hay una lista fija. Como el filtro compara sin distinguir mayúsculas,
   * acá se deduplica con el mismo criterio (y sin espacios de borde), y de
   * cada grupo queda la primera grafía en orden alfabético. Si los POs piden
   * una lista fija de localidades, esto se reemplaza por esa tabla.
   */
  async findLocalidades(): Promise<CatalogoItemDto[]> {
    const proyectos = await this.prisma.pROYECTO.findMany({
      where: { estado: true },
      select: { localidad: true },
      distinct: ['localidad'],
    });

    const grafias = proyectos
      .map((proyecto) => proyecto.localidad.trim())
      .sort((a, b) => a.localeCompare(b, 'es'));

    const porClave = new Map<string, string>();
    for (const grafia of grafias) {
      const clave = grafia.toLowerCase();
      if (!porClave.has(clave)) {
        porClave.set(clave, grafia);
      }
    }

    return [...porClave.values()].map((localidad) => ({
      id: localidad,
      code: localidad,
      metadata: {},
    }));
  }

  /**
   * Alta de un proyecto. Nace En planificación y activo, con el nombre libre
   * entre los proyectos activos (sin distinguir mayúsculas).
   *
   * El código lo genera el sistema como `PROY-` + el id con 4 dígitos
   * (`PROY-0001`): el PK autoincremental hace de correlativo, no hay un
   * servicio de numeración aparte. Como el id recién se conoce después del
   * INSERT y `codigo` es obligatorio y único, la fila se crea con un valor
   * temporal único y se corrige en la misma transacción — nunca queda visible
   * un proyecto con el código temporal.
   */
  async create(dto: CreateProyectoDto, usuarioId: number) {
    const idProyecto = await this.prisma.$transaction(async (tx) => {
      await this.validarNombreUnico(tx, dto.nombre);

      const { id_proyecto } = await tx.pROYECTO.create({
        data: {
          ...dto,
          codigo: `TMP-${randomUUID()}`,
          estado_obra: EstadoProyecto.EN_PLANIFICACION,
          FK_usuario_creador: usuarioId,
          FK_usuario_actualizador: usuarioId,
          hora_actualizacion: new Date(),
        },
        select: { id_proyecto: true },
      });

      await tx.pROYECTO.update({
        where: { id_proyecto },
        data: { codigo: `PROY-${String(id_proyecto).padStart(4, '0')}` },
      });

      return id_proyecto;
    });

    return this.findOne(idProyecto);
  }

  /**
   * Listado paginado, ordenado por nombre, con filtros combinables por baja
   * lógica (por defecto solo activos), estado de obra, localidad (exacta, sin
   * distinguir mayúsculas) y búsqueda por nombre (cada palabra por separado,
   * sin importar el orden) o por código. Cada proyecto trae su presupuesto y
   * cuántas unidades tiene cargadas.
   */
  async findAll(query: QueryProyectoDto) {
    const { busqueda, estado, estado_obra, localidad, page, limit } = query;

    // Sin filtro explícito, el listado muestra solo activos. `estado:
    // 'todos'` saca el filtro del todo: trae activos y dados de baja.
    const filtroEstado =
      estado === undefined ? true : estado === 'todos' ? undefined : estado;

    const where: Prisma.PROYECTOWhereInput = {
      ...(filtroEstado !== undefined && { estado: filtroEstado }),
      ...(estado_obra && { estado_obra }),
      ...(localidad && {
        localidad: { equals: localidad, mode: 'insensitive' },
      }),
      ...(busqueda && {
        OR: [
          condicionBusquedaPorPalabras<Prisma.PROYECTOWhereInput>(
            'nombre',
            busqueda,
          ),
          { codigo: { contains: busqueda, mode: 'insensitive' } },
        ],
      }),
    };

    const [proyectos, total] = await Promise.all([
      this.prisma.pROYECTO.findMany({
        where,
        select: PROYECTO_SELECT,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.pROYECTO.count({ where }),
    ]);

    const resumenes = await this.calcularResumenes(
      proyectos.map((proyecto) => proyecto.id_proyecto),
    );

    return {
      data: proyectos.map((proyecto) =>
        this.mapear(proyecto, resumenes.get(proyecto.id_proyecto)),
      ),
      meta: { total, page, limit },
    };
  }

  /**
   * Detalle de un proyecto, esté activo o dado de baja: además de lo del
   * listado, trae las imágenes de diseño y quién lo creó y modificó.
   */
  async findOne(id: number) {
    const proyecto = await this.prisma.pROYECTO.findUnique({
      where: { id_proyecto: id },
      select: PROYECTO_DETALLE_SELECT,
    });

    if (!proyecto) {
      throw new NotFoundException(`No existe un proyecto con id ${id}`);
    }

    const resumenes = await this.calcularResumenes([id]);
    return this.mapear(proyecto, resumenes.get(id));
  }

  /**
   * Edición parcial. Se rechaza si el proyecto está dado de baja o
   * Cancelado; si el nombre choca con otro proyecto activo; si las unidades
   * planificadas quedan por debajo de las activas ya cargadas; o si se
   * intenta cambiar la fecha de fin estimada de un proyecto Finalizado.
   */
  async update(id: number, dto: UpdateProyectoDto, usuarioId: number) {
    await this.prisma.$transaction(async (tx) => {
      const proyecto = await this.bloquearProyecto(tx, id);
      this.validarModificable(proyecto);

      if (dto.nombre !== undefined) {
        await this.validarNombreUnico(tx, dto.nombre, id);
      }

      if (dto.cantidad_unidades_planificadas !== undefined) {
        const activas = await this.contarUnidadesActivas(tx, id);
        if (dto.cantidad_unidades_planificadas < activas) {
          throw new ConflictException(
            `Las unidades planificadas no pueden ser menos que las ya cargadas: el proyecto tiene ${activas} unidad(es) activa(s) y se intentó planificar ${dto.cantidad_unidades_planificadas}.`,
          );
        }
      }

      // Con el proyecto Finalizado la fecha de fin ya es un hecho. Reenviar
      // el mismo valor (un formulario que manda todos los campos) no es un
      // cambio, así que no se rechaza.
      if (
        dto.fecha_fin_estimada !== undefined &&
        proyecto.estado_obra === EstadoProyecto.FINALIZADO &&
        !this.esLaMismaFecha(
          dto.fecha_fin_estimada,
          proyecto.fecha_fin_estimada,
        )
      ) {
        throw new ConflictException(
          'No se puede cambiar la fecha de fin estimada: el proyecto está Finalizado.',
        );
      }

      // El refine del DTO solo ve lo que llega en el body: acá se cruza con
      // los valores que ya estaban guardados (ej. llega solo la fecha de
      // inicio y queda posterior a la de fin).
      const fechaInicio =
        dto.fecha_inicio !== undefined
          ? dto.fecha_inicio
          : proyecto.fecha_inicio;
      const fechaFin =
        dto.fecha_fin_estimada !== undefined
          ? dto.fecha_fin_estimada
          : proyecto.fecha_fin_estimada;
      if (
        fechaInicio &&
        fechaFin &&
        fechaFin.getTime() < fechaInicio.getTime()
      ) {
        throw new BadRequestException(
          'La fecha de fin estimada no puede ser anterior a la fecha de inicio',
        );
      }

      await tx.pROYECTO.update({
        where: { id_proyecto: id },
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
   * Avanza el estado de obra, siempre al inmediatamente siguiente: En
   * planificación → En ejecución → Finalizado. No hay saltos, retrocesos ni
   * repeticiones. Para pasar a En ejecución el proyecto necesita al menos una
   * unidad activa.
   */
  async cambiarEstadoObra(
    id: number,
    dto: CambiarEstadoObraDto,
    usuarioId: number,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const proyecto = await this.bloquearProyecto(tx, id);

      if (!proyecto.estado) {
        throw new ConflictException(
          'No se puede cambiar el estado de obra: el proyecto está dado de baja.',
        );
      }
      // Cancelado es terminal: HU-31 no lo contempla y todavía no está
      // definido desde dónde se llega ni si se puede salir (OBS-22). Según
      // esa respuesta, T159 lo elimina del enum o esta regla se reescribe.
      if (proyecto.estado_obra === EstadoProyecto.CANCELADO) {
        throw new ConflictException(
          'No se puede cambiar el estado de obra: el proyecto está Cancelado.',
        );
      }

      const actual = ESTADO_PROYECTO_LABELS[proyecto.estado_obra];
      const destino = ESTADO_PROYECTO_LABELS[dto.estado_obra];
      const siguiente = SIGUIENTE_ESTADO_OBRA[proyecto.estado_obra];
      if (siguiente !== dto.estado_obra) {
        throw new ConflictException(
          siguiente
            ? `No se puede pasar de ${actual} a ${destino}: desde ${actual} solo se puede avanzar a ${ESTADO_PROYECTO_LABELS[siguiente]}.`
            : `No se puede pasar de ${actual} a ${destino}: ${actual} es el último estado de obra.`,
        );
      }

      if (dto.estado_obra === EstadoProyecto.EN_EJECUCION) {
        const activas = await this.contarUnidadesActivas(tx, id);
        if (activas === 0) {
          throw new ConflictException(
            'No se puede pasar a En ejecución: el proyecto no tiene ninguna unidad funcional activa cargada.',
          );
        }
      }

      await tx.pROYECTO.update({
        where: { id_proyecto: id },
        data: {
          estado_obra: dto.estado_obra,
          FK_usuario_actualizador: usuarioId,
          hora_actualizacion: new Date(),
        },
      });
    });

    return this.findOne(id);
  }

  /**
   * Baja lógica: solo de un proyecto activo, En planificación y sin unidades
   * funcionales activas. No hay reactivación (HU-31 no la pide).
   */
  async baja(id: number, usuarioId: number) {
    await this.prisma.$transaction(async (tx) => {
      const proyecto = await this.bloquearProyecto(tx, id);

      if (!proyecto.estado) {
        throw new ConflictException('El proyecto ya está dado de baja');
      }
      if (proyecto.estado_obra !== EstadoProyecto.EN_PLANIFICACION) {
        throw new ConflictException(
          `El proyecto no puede darse de baja: está ${ESTADO_PROYECTO_LABELS[proyecto.estado_obra]}. Solo se puede dar de baja un proyecto En planificación.`,
        );
      }
      const activas = await this.contarUnidadesActivas(tx, id);
      if (activas > 0) {
        throw new ConflictException(
          `El proyecto no puede darse de baja: tiene ${activas} unidad(es) funcional(es) activa(s). Primero hay que darlas de baja.`,
        );
      }

      await tx.pROYECTO.update({
        where: { id_proyecto: id },
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
   * Suma una imagen de diseño (render o plano). Solo persiste la URL que
   * devolvió POST /almacenamiento/imagenes, su tipo y su orden; sin `orden`,
   * va al final. El orden es uno solo para todo el proyecto, no por tipo.
   */
  async agregarImagen(
    id: number,
    dto: CreateImagenProyectoDto,
    usuarioId: number,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const proyecto = await this.bloquearProyecto(tx, id);
      this.validarModificable(proyecto);

      let orden = dto.orden;
      if (orden === undefined) {
        const { _max } = await tx.iMAGENPROYECTO.aggregate({
          where: { FK_proyecto: id },
          _max: { orden: true },
        });
        orden = (_max.orden ?? -1) + 1;
      }

      await tx.iMAGENPROYECTO.create({
        data: { FK_proyecto: id, url: dto.url, tipo: dto.tipo, orden },
      });
      await this.registrarAuditoria(tx, id, usuarioId);
    });

    return this.findOne(id);
  }

  /**
   * Quita una imagen de diseño. Borrado físico: una imagen no es historial
   * financiero ni contractual (ver IMAGENPROYECTO en el esquema; el archivo
   * queda en el almacenamiento de objetos, que no tiene borrado).
   */
  async quitarImagen(id: number, idImagen: number, usuarioId: number) {
    await this.prisma.$transaction(async (tx) => {
      const proyecto = await this.bloquearProyecto(tx, id);
      this.validarModificable(proyecto);

      const { count } = await tx.iMAGENPROYECTO.deleteMany({
        where: { id_imagen_proyecto: idImagen, FK_proyecto: id },
      });
      if (count === 0) {
        throw new NotFoundException(
          `No existe una imagen con id ${idImagen} en el proyecto ${id}`,
        );
      }
      await this.registrarAuditoria(tx, id, usuarioId);
    });

    return this.findOne(id);
  }

  /**
   * Reordena la galería: recibe TODAS las imágenes del proyecto en el orden
   * nuevo y deja cada una con `orden` igual a su posición (desde 0).
   */
  async ordenarImagenes(
    id: number,
    dto: OrdenarImagenesProyectoDto,
    usuarioId: number,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const proyecto = await this.bloquearProyecto(tx, id);
      this.validarModificable(proyecto);

      const actuales = await tx.iMAGENPROYECTO.findMany({
        where: { FK_proyecto: id },
        select: { id_imagen_proyecto: true },
      });
      const idsActuales = new Set(actuales.map((i) => i.id_imagen_proyecto));
      const idsNuevos = dto.ids_imagen_proyecto;

      if (
        idsNuevos.length !== idsActuales.size ||
        idsNuevos.some((idImagen) => !idsActuales.has(idImagen))
      ) {
        throw new BadRequestException(
          'La lista debe incluir exactamente las imágenes actuales del proyecto, cada una una sola vez',
        );
      }

      for (const [orden, idImagen] of idsNuevos.entries()) {
        await tx.iMAGENPROYECTO.update({
          where: { id_imagen_proyecto: idImagen },
          data: { orden },
        });
      }
      await this.registrarAuditoria(tx, id, usuarioId);
    });

    return this.findOne(id);
  }

  /**
   * Toma el lock de la fila (`SELECT ... FOR UPDATE`), igual que
   * `UnidadFuncionalService.bloquearUnidad`: serializa entre sí todas las
   * escrituras sobre un mismo proyecto, y hace esperar a un alta de unidad
   * concurrente (su INSERT necesita un lock sobre esta fila por la FK).
   *
   * LÍMITE CONOCIDO: la baja y la reactivación de una unidad no tocan esta
   * fila, y el alta de unidad valida el estado del proyecto antes de pedir
   * el lock. Hasta que esas tres operaciones tomen también este lock, una
   * regla que cuenta unidades activas (pasar a En ejecución, la baja, bajar
   * las planificadas) todavía puede competir con ellas. Ese cierre va en
   * T128, que necesita el mismo lock para validar el límite de planificadas.
   */
  private async bloquearProyecto(
    tx: Prisma.TransactionClient,
    id: number,
  ): Promise<ProyectoBloqueado> {
    const filas = await tx.$queryRaw<{ id_proyecto: number }[]>(
      Prisma.sql`SELECT "id_proyecto" FROM "PROYECTO" WHERE "id_proyecto" = ${id} FOR UPDATE`,
    );
    if (filas.length === 0) {
      throw new NotFoundException(`No existe un proyecto con id ${id}`);
    }

    // La fila acaba de bloquearse: existe.
    return (await tx.pROYECTO.findUnique({
      where: { id_proyecto: id },
      select: {
        estado: true,
        estado_obra: true,
        fecha_inicio: true,
        fecha_fin_estimada: true,
      },
    }))!;
  }

  /** Las operaciones de imágenes no tocan el proyecto, pero igual quedan auditadas en él. */
  private async registrarAuditoria(
    tx: Prisma.TransactionClient,
    id: number,
    usuarioId: number,
  ) {
    await tx.pROYECTO.update({
      where: { id_proyecto: id },
      data: {
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  private contarUnidadesActivas(tx: Prisma.TransactionClient, id: number) {
    return tx.uNIDADFUNCIONAL.count({
      where: { FK_proyecto: id, estado: true },
    });
  }

  /** Ni la edición ni las imágenes se permiten sobre un proyecto dado de baja o Cancelado. */
  private validarModificable(proyecto: ProyectoBloqueado) {
    if (!proyecto.estado) {
      throw new ConflictException(
        'No se puede modificar el proyecto: está dado de baja.',
      );
    }
    if (proyecto.estado_obra === EstadoProyecto.CANCELADO) {
      throw new ConflictException(
        'No se puede modificar el proyecto: está Cancelado.',
      );
    }
  }

  /**
   * El nombre es único solo entre los proyectos ACTIVOS, sin distinguir
   * mayúsculas: uno dado de baja libera su nombre. Se valida acá y no con
   * una restricción de base.
   */
  private async validarNombreUnico(
    tx: Prisma.TransactionClient,
    nombre: string,
    idExcluido?: number,
  ) {
    await validarNombreUnicoEntreActivos({
      entidadActiva: 'un proyecto activo',
      nombre,
      existeOtroActivo: () =>
        tx.pROYECTO
          .findFirst({
            where: {
              nombre: { equals: nombre, mode: 'insensitive' },
              estado: true,
              ...(idExcluido !== undefined && {
                id_proyecto: { not: idExcluido },
              }),
            },
            select: { id_proyecto: true },
          })
          .then((proyecto) => proyecto !== null),
    });
  }

  private esLaMismaFecha(a: Date | null, b: Date | null) {
    return (a?.getTime() ?? null) === (b?.getTime() ?? null);
  }

  /**
   * Presupuesto y unidades cargadas de varios proyectos en una sola consulta
   * (sin N+1). Solo cuenta las unidades ACTIVAS: por eso el presupuesto baja
   * al dar de baja una unidad y vuelve a subir al reactivarla.
   */
  private async calcularResumenes(idsProyectos: number[]) {
    const grupos = await this.prisma.uNIDADFUNCIONAL.groupBy({
      by: ['FK_proyecto'],
      where: { estado: true, FK_proyecto: { in: idsProyectos } },
      _count: { _all: true },
      _sum: { costo: true },
    });

    return new Map<number, ResumenUnidades>(
      grupos.map((grupo) => [
        grupo.FK_proyecto,
        {
          cargadas: grupo._count._all,
          presupuesto: grupo._sum.costo?.toNumber() ?? 0,
        },
      ]),
    );
  }

  /** Suma los dos valores calculados; `estado` (baja lógica) y `estado_obra` salen tal cual. */
  private mapear<T extends ProyectoBase>(
    proyecto: T,
    resumen?: ResumenUnidades,
  ) {
    return {
      ...proyecto,
      unidades_cargadas: resumen?.cargadas ?? 0,
      presupuesto: resumen?.presupuesto ?? 0,
    };
  }
}
