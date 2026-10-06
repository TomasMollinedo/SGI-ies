import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { calcularCondicionEntregaResponse } from '../comercializacion/common/condicion-entrega';
import {
  exigirPrecioPlanEjemplo,
  exigirTipoPlanEjemplo,
} from '../comercializacion/plan-pago/exigir-condiciones-plan-ejemplo';
import {
  EstadoComercial,
  EstadoProyecto,
} from '../../../generated/prisma/enums';
import type { Prisma } from '../../../generated/prisma/client';
import { QueryCatalogoDto } from './dto/query-catalogo.dto';

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
      estado_obra: true,
      fecha_fin_estimada: true,
    },
  },
  // Solo la portada (la de menor `orden`), para que la tarjeta del catálogo
  // tenga su imagen sin pedir el detalle de cada unidad: Prisma la resuelve
  // dentro de la misma consulta del listado, no una por fila.
  // `obtenerDetalle` vuelve a declarar `imagenes` después de este spread y se
  // queda con la galería completa.
  imagenes: {
    select: { url: true },
    orderBy: { orden: 'asc' as const },
    take: 1,
  },
} as const;

@Injectable()
export class CatalogoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * El catálogo se consulta desde PUBLICACIONUNIDAD, no desde UNIDADFUNCIONAL:
   * es la única forma de ordenar por `fecha_publicacion` (campo propio de la
   * publicación) y de leer su `precio_lista` (también propio de la
   * publicación) en la misma consulta.
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
              estado_obra: entregada
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
          id_publicacion: true,
          fecha_publicacion: true,
          precio_lista: true,
          unidadFuncional: { select: UNIDAD_CATALOGO_SELECT },
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
        id_publicacion: true,
        fecha_publicacion: true,
        precio_lista: true,
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
        planesEjemplo: {
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
      planes: publicacion.planesEjemplo.map((plan) => ({
        nombre: plan.nombre,
        tipo: exigirTipoPlanEjemplo(plan.tipo),
        precio: exigirPrecioPlanEjemplo(plan.precio).toNumber(),
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
   * disponibles tiene cada proyecto, después el menor precio de lista y los
   * datos de esos 4 proyectos puntuales.
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
        id_publicacion: true,
        precio_lista: true,
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
      },
    });

    const precioDesdePorProyecto = new Map<number, number>();
    const datosProyecto = new Map<
      number,
      { nombre: string; localidad: string; imagen_portada_url: string | null }
    >();

    for (const publicacion of publicaciones) {
      const idProyecto = publicacion.unidadFuncional.FK_proyecto;
      const precioLista = exigirPrecioLista(publicacion).toNumber();

      datosProyecto.set(idProyecto, publicacion.unidadFuncional.proyecto);

      const precioActual = precioDesdePorProyecto.get(idProyecto);
      if (precioActual === undefined || precioLista < precioActual) {
        precioDesdePorProyecto.set(idProyecto, precioLista);
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

/**
 * Una publicación DISPONIBLE siempre tiene precio de lista: es justamente
 * definirlo lo que la pasa a DISPONIBLE (`PublicacionService.definirPrecioLista`),
 * y una vez definido no se puede quitar. Si falta es un dato inconsistente,
 * no un error del visitante: por eso es un 500.
 */
function exigirPrecioLista(publicacion: {
  id_publicacion: number;
  precio_lista: Prisma.Decimal | null;
}): Prisma.Decimal {
  if (publicacion.precio_lista === null) {
    throw new InternalServerErrorException(
      `La publicación ${publicacion.id_publicacion} está Disponible sin precio de lista`,
    );
  }
  return publicacion.precio_lista;
}

type PublicacionParaListado = {
  id_publicacion: number;
  fecha_publicacion: Date;
  precio_lista: Prisma.Decimal | null;
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
      estado_obra: EstadoProyecto;
      fecha_fin_estimada: Date | null;
    };
    imagenes: { url: string }[];
  };
};

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
    imagen_url: unidadFuncional.imagenes[0]?.url ?? null,
    // El nombre del campo es del contrato del Sprint 3; desde T133 es el
    // precio de lista (precio de contado) de la publicación.
    precio_desde: exigirPrecioLista(publicacion).toNumber(),
    condicion_entrega: calcularCondicionEntregaResponse(proyecto),
    fecha_publicacion: publicacion.fecha_publicacion.toISOString(),
  };
}
