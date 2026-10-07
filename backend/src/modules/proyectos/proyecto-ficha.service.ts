import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { estadoComercialUnidadSchema } from '../comercializacion/unidades-funcionales/dto/estado-comercial-unidad';
import {
  calcularSituacionComercial,
  type UnidadComercial,
} from './situacion-comercial';

/**
 * A lo sumo una publicación vigente por unidad: de ella salen el estado
 * comercial y el precio de lista. Mismo criterio que el listado de unidades
 * (`UnidadFuncionalService`).
 */
const PUBLICACION_VIGENTE_ARGS = {
  where: { vigente: true },
  select: { estado_comercial: true, precio_lista: true },
  take: 1,
} as const satisfies Prisma.UNIDADFUNCIONAL$publicacionesArgs;

const UNIDAD_PORCENTAJE_SELECT = {
  FK_proyecto: true,
  publicaciones: PUBLICACION_VIGENTE_ARGS,
} as const satisfies Prisma.UNIDADFUNCIONALSelect;

const UNIDAD_FICHA_SELECT = {
  id_unidad_funcional: true,
  identificador: true,
  tipologia: true,
  superficie_cubierta: true,
  costo: true,
  publicaciones: PUBLICACION_VIGENTE_ARGS,
} as const satisfies Prisma.UNIDADFUNCIONALSelect;

type PublicacionVigente = Prisma.PUBLICACIONUNIDADGetPayload<{
  select: (typeof PUBLICACION_VIGENTE_ARGS)['select'];
}>;

/** Sin publicación vigente, la unidad está sin publicar y no tiene precio. */
function aUnidadComercial(unidad: {
  publicaciones: PublicacionVigente[];
}): UnidadComercial {
  const vigente = unidad.publicaciones.at(0);
  return {
    estado_comercial:
      vigente?.estado_comercial ??
      estadoComercialUnidadSchema.enum.SIN_PUBLICAR,
    precio_lista: vigente?.precio_lista ?? null,
  };
}

/**
 * Datos calculados de la ficha del proyecto (HU-31): precio estimado de
 * venta, situación comercial y lista de unidades. Siempre sobre las unidades
 * ACTIVAS, y sin guardar nada: las cuentas las hace
 * `calcularSituacionComercial`, tanto para la ficha como para el porcentaje
 * vendido del listado.
 */
@Injectable()
export class ProyectoFichaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ficha de un proyecto, esté activo, dado de baja o Cancelado (igual que el
   * detalle). Las unidades salen ordenadas por identificador con orden
   * natural ("U2" antes que "U10").
   */
  async obtenerFicha(id: number) {
    const proyecto = await this.prisma.pROYECTO.findUnique({
      where: { id_proyecto: id },
      select: { id_proyecto: true },
    });
    if (!proyecto) {
      throw new NotFoundException(`No existe un proyecto con id ${id}`);
    }

    const filas = await this.prisma.uNIDADFUNCIONAL.findMany({
      where: { FK_proyecto: id, estado: true },
      select: UNIDAD_FICHA_SELECT,
    });

    const unidades = filas
      .map(({ publicaciones, ...unidad }) => ({
        ...unidad,
        ...aUnidadComercial({ publicaciones }),
      }))
      .sort((a, b) =>
        a.identificador.localeCompare(b.identificador, 'es', { numeric: true }),
      );

    const situacion = calcularSituacionComercial(unidades);

    return {
      id_proyecto: proyecto.id_proyecto,
      precio_estimado: situacion.precio_estimado,
      situacion_comercial: {
        por_estado: situacion.por_estado,
        porcentaje_vendido: situacion.porcentaje_vendido,
        todas_vendidas: situacion.todas_vendidas,
      },
      unidades: unidades.map((unidad) => ({
        id_unidad_funcional: unidad.id_unidad_funcional,
        identificador: unidad.identificador,
        tipologia: unidad.tipologia,
        superficie_cubierta: unidad.superficie_cubierta.toNumber(),
        costo: unidad.costo.toNumber(),
        precio_lista: unidad.precio_lista?.toNumber() ?? null,
        estado_comercial: unidad.estado_comercial,
      })),
    };
  }

  /**
   * Porcentaje vendido de varios proyectos en una sola consulta (sin N+1),
   * para el listado. Un proyecto sin unidades activas no aparece en el mapa:
   * quien lo consume lo toma como 0.
   */
  async calcularPorcentajesVendidos(idsProyectos: number[]) {
    const filas = await this.prisma.uNIDADFUNCIONAL.findMany({
      where: { estado: true, FK_proyecto: { in: idsProyectos } },
      select: UNIDAD_PORCENTAJE_SELECT,
    });

    const unidadesPorProyecto = new Map<number, UnidadComercial[]>();
    for (const fila of filas) {
      const unidades = unidadesPorProyecto.get(fila.FK_proyecto) ?? [];
      unidades.push(aUnidadComercial(fila));
      unidadesPorProyecto.set(fila.FK_proyecto, unidades);
    }

    return new Map<number, number>(
      [...unidadesPorProyecto].map(([idProyecto, unidades]) => [
        idProyecto,
        calcularSituacionComercial(unidades).porcentaje_vendido,
      ]),
    );
  }
}
