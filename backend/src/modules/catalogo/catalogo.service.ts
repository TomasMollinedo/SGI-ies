import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { calcularCondicionEntrega } from '../comercializacion/common/condicion-entrega';
import {
  EstadoComercial,
  EstadoProyecto,
} from '../../../generated/prisma/enums';
import type { Prisma } from '../../../generated/prisma/client';
import { QueryCatalogoDto } from './dto/query-catalogo.dto';

const PLAN_ACTIVO_MAS_BARATO_SELECT = {
  where: { estado: true },
  select: { precio: true },
  orderBy: { precio: 'asc' as const },
  take: 1,
};

const UNIDAD_CATALOGO_SELECT = {
  id_unidad_funcional: true,
  identificador: true,
  tipologia: true,
  superficie_cubierta: true,
  superficie_descubierta: true,
  piso: true,
  proyecto: {
    select: {
      nombre: true,
      localidad: true,
      estado: true,
      fecha_fin_estimada: true,
    },
  },
} as const;

@Injectable()
export class CatalogoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * El catálogo se consulta desde PUBLICACIONUNIDAD, no desde UNIDADFUNCIONAL:
   * es la única forma de ordenar por `fecha_publicacion` (campo propio de la
   * publicación) y de traer el precio más barato entre sus planes activos con
   * un `include`/`orderBy`+`take` anidado, en una sola consulta por página —
   * sin eso, habría que pedirle los planes a cada unidad por separado (N+1).
   */
  async listarCatalogo(query: QueryCatalogoDto) {
    const { FK_proyecto, localidad, tipologia, entregada, page, limit } = query;

    const where: Prisma.PUBLICACIONUNIDADWhereInput = {
      vigente: true,
      estado_comercial: EstadoComercial.DISPONIBLE,
      unidadFuncional: {
        estado: true,
        ...(FK_proyecto !== undefined && { FK_proyecto }),
        ...(tipologia !== undefined && { tipologia }),
        ...((localidad !== undefined || entregada !== undefined) && {
          proyecto: {
            ...(localidad !== undefined && {
              localidad: { contains: localidad, mode: 'insensitive' },
            }),
            ...(entregada !== undefined && {
              estado: entregada
                ? EstadoProyecto.FINALIZADO
                : { not: EstadoProyecto.FINALIZADO },
            }),
          },
        }),
      },
    };

    const [publicaciones, total] = await Promise.all([
      this.prisma.pUBLICACIONUNIDAD.findMany({
        where,
        select: {
          fecha_publicacion: true,
          unidadFuncional: { select: UNIDAD_CATALOGO_SELECT },
          planes: PLAN_ACTIVO_MAS_BARATO_SELECT,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fecha_publicacion: 'desc' },
      }),
      this.prisma.pUBLICACIONUNIDAD.count({ where }),
    ]);

    return {
      data: publicaciones.map(mapearItemCatalogo),
      meta: { total, page, limit },
    };
  }

  async obtenerDetalle(idUnidadFuncional: number) {
    const publicacion = await this.prisma.pUBLICACIONUNIDAD.findFirst({
      where: {
        vigente: true,
        estado_comercial: EstadoComercial.DISPONIBLE,
        unidadFuncional: {
          id_unidad_funcional: idUnidadFuncional,
          estado: true,
        },
      },
      select: {
        fecha_publicacion: true,
        unidadFuncional: {
          select: {
            ...UNIDAD_CATALOGO_SELECT,
            comodidades: true,
            observaciones: true,
            imagenes: {
              select: { url: true, orden: true },
              orderBy: { orden: 'asc' },
            },
          },
        },
        planes: {
          where: { estado: true },
          select: {
            nombre: true,
            tipo: true,
            precio: true,
            anticipo_porcentaje: true,
            anticipo_monto: true,
            cantidad_cuotas: true,
            periodicidad: true,
          },
          orderBy: { precio: 'asc' },
        },
      },
    });

    // No existe, o existe pero no está publicada/disponible: de cara al
    // catálogo público es lo mismo, no se distingue el motivo.
    if (!publicacion) {
      throw new NotFoundException('No existe una unidad disponible con ese id');
    }

    return {
      ...mapearItemCatalogo(publicacion),
      comodidades: publicacion.unidadFuncional.comodidades,
      observaciones: publicacion.unidadFuncional.observaciones,
      imagenes: publicacion.unidadFuncional.imagenes,
      planes: publicacion.planes.map((plan) => ({
        nombre: plan.nombre,
        tipo: plan.tipo,
        precio: plan.precio.toNumber(),
        anticipo_porcentaje: plan.anticipo_porcentaje?.toNumber() ?? null,
        anticipo_monto: plan.anticipo_monto?.toNumber() ?? null,
        cantidad_cuotas: plan.cantidad_cuotas,
        periodicidad: plan.periodicidad,
      })),
    };
  }

  /**
   * Los proyectos con más unidades disponibles ahora mismo, hasta 4. Se
   * calcula en dos consultas (no hay forma de agrupar por proyecto en una
   * sola: `groupBy` no cruza relaciones anidadas): primero cuántas unidades
   * disponibles tiene cada proyecto, después el precio más barato y los datos
   * de esos 4 proyectos puntuales.
   */
  async obtenerDestacados() {
    const conteos = await this.prisma.uNIDADFUNCIONAL.groupBy({
      by: ['FK_proyecto'],
      where: {
        estado: true,
        publicaciones: {
          some: { vigente: true, estado_comercial: EstadoComercial.DISPONIBLE },
        },
      },
      _count: true,
      // El orden por cantidad exige referenciar un campo puntual (no existe
      // `_all` acá, a diferencia del `_count` de arriba): `id_unidad_funcional`
      // nunca es null, así que contarlo equivale a contar filas del grupo.
      orderBy: { _count: { id_unidad_funcional: 'desc' } },
      take: 4,
    });

    if (conteos.length === 0) {
      return { data: [] };
    }

    const idsProyectosDestacados = conteos.map((c) => c.FK_proyecto);

    const publicaciones = await this.prisma.pUBLICACIONUNIDAD.findMany({
      where: {
        vigente: true,
        estado_comercial: EstadoComercial.DISPONIBLE,
        unidadFuncional: { FK_proyecto: { in: idsProyectosDestacados } },
      },
      select: {
        unidadFuncional: {
          select: {
            FK_proyecto: true,
            proyecto: {
              select: {
                nombre: true,
                localidad: true,
                imagen_portada_url: true,
              },
            },
          },
        },
        planes: PLAN_ACTIVO_MAS_BARATO_SELECT,
      },
    });

    const precioDesdePorProyecto = new Map<number, number>();
    const datosProyecto = new Map<
      number,
      { nombre: string; localidad: string; imagen_portada_url: string | null }
    >();

    for (const publicacion of publicaciones) {
      const idProyecto = publicacion.unidadFuncional.FK_proyecto;
      const precioPlan = publicacion.planes[0]?.precio.toNumber();

      datosProyecto.set(idProyecto, publicacion.unidadFuncional.proyecto);

      if (precioPlan !== undefined) {
        const precioActual = precioDesdePorProyecto.get(idProyecto);
        if (precioActual === undefined || precioPlan < precioActual) {
          precioDesdePorProyecto.set(idProyecto, precioPlan);
        }
      }
    }

    return {
      data: conteos.map((conteo) => {
        const proyecto = datosProyecto.get(conteo.FK_proyecto)!;
        return {
          id_proyecto: conteo.FK_proyecto,
          nombre: proyecto.nombre,
          localidad: proyecto.localidad,
          imagen_portada_url: proyecto.imagen_portada_url,
          cantidad_disponibles: conteo._count,
          precio_desde: precioDesdePorProyecto.get(conteo.FK_proyecto)!,
        };
      }),
    };
  }
}

type PublicacionParaListado = {
  fecha_publicacion: Date;
  unidadFuncional: {
    id_unidad_funcional: number;
    identificador: string;
    tipologia: string;
    superficie_cubierta: Prisma.Decimal;
    superficie_descubierta: Prisma.Decimal | null;
    piso: string | null;
    proyecto: {
      nombre: string;
      localidad: string;
      estado: EstadoProyecto;
      fecha_fin_estimada: Date | null;
    };
  };
  planes: { precio: Prisma.Decimal }[];
};

/**
 * `calcularCondicionEntrega` (T103) devuelve `fecha_referencia` como `Date`;
 * acá se pasa a ISO string, igual que el resto de las fechas de este DTO.
 */
function mapearCondicionEntrega(proyecto: {
  estado: EstadoProyecto;
  fecha_fin_estimada: Date | null;
}) {
  const condicion = calcularCondicionEntrega(proyecto);
  return {
    ...condicion,
    fecha_referencia: condicion.fecha_referencia?.toISOString() ?? null,
  };
}

function mapearItemCatalogo(publicacion: PublicacionParaListado) {
  const { unidadFuncional } = publicacion;
  const { proyecto } = unidadFuncional;

  return {
    id_unidad_funcional: unidadFuncional.id_unidad_funcional,
    identificador: unidadFuncional.identificador,
    tipologia: unidadFuncional.tipologia,
    superficie_cubierta: unidadFuncional.superficie_cubierta.toNumber(),
    superficie_descubierta:
      unidadFuncional.superficie_descubierta?.toNumber() ?? null,
    piso: unidadFuncional.piso,
    proyecto: { nombre: proyecto.nombre, localidad: proyecto.localidad },
    // Garantizado por reglas de negocio: una publicación DISPONIBLE siempre
    // tiene al menos un plan activo (si se inactivan todos, la publicación
    // vuelve a EN_PREPARACION), así que planes[0] siempre existe acá.
    precio_desde: publicacion.planes[0].precio.toNumber(),
    condicion_entrega: mapearCondicionEntrega(proyecto),
    fecha_publicacion: publicacion.fecha_publicacion.toISOString(),
  };
}
