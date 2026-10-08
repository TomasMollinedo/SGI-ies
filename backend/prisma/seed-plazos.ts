import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import type { PlazoVentaSeed } from './seed-ventas';

/**
 * Helper compartido por los seeds que siembran planes de ejemplo
 * (`seed-comercializacion.ts` y `seed-t112-cliente1.ts`). No es un seed: no
 * se ejecuta solo.
 *
 * Siembra los plazos de financiación (HU-32) como los dejaría
 * `PlazoFinanciacionService`: código `PLZ-NNN` generado a partir del id, y
 * cantidad de cuotas única entre los activos. Cubre los casos que necesitan
 * los planes de ejemplo y el simulador: un plazo sin interés (TNA 0 %),
 * varios con interés y uno dado de baja (sus planes no se muestran).
 */

interface PlazoSeed {
  cantidad_cuotas: number;
  tasa_nominal_anual: number;
  descripcion: string | null;
  estado: boolean;
}

const PLAZOS: PlazoSeed[] = [
  {
    cantidad_cuotas: 3,
    tasa_nominal_anual: 0,
    descripcion: 'Promoción sin interés',
    estado: true,
  },
  {
    cantidad_cuotas: 6,
    tasa_nominal_anual: 18,
    descripcion: null,
    estado: true,
  },
  {
    cantidad_cuotas: 12,
    tasa_nominal_anual: 24,
    descripcion: null,
    estado: true,
  },
  {
    cantidad_cuotas: 24,
    tasa_nominal_anual: 36,
    descripcion: null,
    estado: true,
  },
  {
    cantidad_cuotas: 36,
    tasa_nominal_anual: 45,
    descripcion: 'Dado de baja: ya no se ofrece',
    estado: false,
  },
];

/**
 * Crea los plazos que falten y devuelve cada uno (id, cuotas y TNA) por
 * cantidad de cuotas. Idempotente por `cantidad_cuotas`: si ya existe un
 * plazo con esa cantidad, lo reutiliza tal cual (con la TNA que tenga).
 */
export async function sembrarPlazos(
  prisma: PrismaClient,
  usuarioId: number,
): Promise<Map<number, PlazoVentaSeed>> {
  const plazoPorCuotas = new Map<number, PlazoVentaSeed>();
  const select = {
    id_plazo_financiacion: true,
    cantidad_cuotas: true,
    tasa_nominal_anual: true,
  };

  for (const datos of PLAZOS) {
    const existente = await prisma.pLAZOFINANCIACION.findFirst({
      where: { cantidad_cuotas: datos.cantidad_cuotas },
      select,
    });

    if (existente) {
      plazoPorCuotas.set(datos.cantidad_cuotas, aPlazoVenta(existente));
      continue;
    }

    // Mismo alta en dos pasos que el service: el código sale del id, que
    // recién existe después del INSERT.
    const creado = await prisma.$transaction(async (tx) => {
      const fila = await tx.pLAZOFINANCIACION.create({
        data: {
          codigo: randomUUID(),
          cantidad_cuotas: datos.cantidad_cuotas,
          tasa_nominal_anual: new Prisma.Decimal(datos.tasa_nominal_anual),
          descripcion: datos.descripcion,
          estado: datos.estado,
          FK_usuario_creador: usuarioId,
          FK_usuario_actualizador: usuarioId,
        },
      });

      return tx.pLAZOFINANCIACION.update({
        where: { id_plazo_financiacion: fila.id_plazo_financiacion },
        data: {
          codigo: `PLZ-${String(fila.id_plazo_financiacion).padStart(3, '0')}`,
        },
        select,
      });
    });

    plazoPorCuotas.set(datos.cantidad_cuotas, aPlazoVenta(creado));
  }

  return plazoPorCuotas;
}

function aPlazoVenta(fila: {
  id_plazo_financiacion: number;
  cantidad_cuotas: number;
  tasa_nominal_anual: Prisma.Decimal;
}): PlazoVentaSeed {
  return { ...fila, tasa_nominal_anual: fila.tasa_nominal_anual.toNumber() };
}
