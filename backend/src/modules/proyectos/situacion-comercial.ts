import { Prisma } from '../../../generated/prisma/client';
import { DECIMALES } from '../../common/constantes/decimales';
import {
  estadoComercialUnidadSchema,
  type EstadoComercialUnidad,
} from '../comercializacion/unidades-funcionales/dto/estado-comercial-unidad';

const { SIN_PUBLICAR, EN_PLAN_DE_PAGO, VENDIDA } =
  estadoComercialUnidadSchema.enum;

/**
 * Lo que el cálculo necesita saber de cada unidad ACTIVA de un proyecto: su
 * estado comercial (`SIN_PUBLICAR` si no tiene publicación vigente) y el
 * precio de lista de esa publicación (null si no tiene publicación vigente o
 * todavía no tiene precio).
 */
export interface UnidadComercial {
  estado_comercial: EstadoComercialUnidad;
  precio_lista: Prisma.Decimal | null;
}

export interface SituacionComercial {
  /** Cantidad de unidades por estado comercial. Siempre las cinco claves. */
  por_estado: Record<EstadoComercialUnidad, number>;
  unidades_activas: number;
  porcentaje_vendido: number;
  todas_vendidas: boolean;
  precio_estimado: { total: number; unidades_calculadas: number };
}

/**
 * Situación comercial y precio estimado de venta de UN proyecto (HU-31), a
 * partir de sus unidades activas. No se persiste: se calcula en cada consulta.
 *
 * - La base son las unidades ACTIVAS, no las planificadas (HU-31, OBS-21): un
 *   proyecto con 10 planificadas y una sola cargada y vendida da 100 % y
 *   `todas_vendidas`. Es la misma base que tiene que usar el margen por
 *   proyecto del tablero (T153, OBS-29), para que los dos muestren el mismo
 *   número.
 * - Una unidad tiene venta vigente si está En Plan de Pago o Vendida.
 * - Sin unidades activas, el porcentaje es 0 y `todas_vendidas` es false: 0
 *   de 0 no es "Todas las unidades vendidas".
 * - `todas_vendidas` sale de los contadores, no del porcentaje (que está
 *   redondeado).
 * - El precio estimado suma solo las unidades con precio de lista cargado:
 *   una En preparación tiene publicación vigente pero todavía no tiene
 *   precio, así que no suma ni cuenta en `unidades_calculadas`.
 */
export function calcularSituacionComercial(
  unidades: UnidadComercial[],
): SituacionComercial {
  const porEstado = Object.fromEntries(
    estadoComercialUnidadSchema.options.map((estado) => [estado, 0]),
  ) as Record<EstadoComercialUnidad, number>;

  // Los importes se suman como Decimal y pasan a number recién al final.
  let total = new Prisma.Decimal(0);
  let unidadesCalculadas = 0;

  for (const unidad of unidades) {
    porEstado[unidad.estado_comercial] += 1;

    if (
      unidad.estado_comercial !== SIN_PUBLICAR &&
      unidad.precio_lista !== null
    ) {
      total = total.plus(unidad.precio_lista);
      unidadesCalculadas += 1;
    }
  }

  const activas = unidades.length;
  const vendidas = porEstado[EN_PLAN_DE_PAGO] + porEstado[VENDIDA];

  return {
    por_estado: porEstado,
    unidades_activas: activas,
    porcentaje_vendido:
      activas === 0
        ? 0
        : new Prisma.Decimal(vendidas)
            .times(100)
            .dividedBy(activas)
            .toDecimalPlaces(DECIMALES)
            .toNumber(),
    todas_vendidas: activas > 0 && vendidas === activas,
    precio_estimado: {
      total: total.toDecimalPlaces(DECIMALES).toNumber(),
      unidades_calculadas: unidadesCalculadas,
    },
  };
}
