import { InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import {
  ModalidadPago,
  Periodicidad,
} from '../../../../generated/prisma/enums';

/**
 * ÚNICO lugar que traduce el PLANPAGO de una venta a las "condiciones
 * congeladas" que exponen los contratos HTTP del Sprint 3 (`precio_congelado`,
 * `anticipo_congelado`, `tipo_plan_congelado`, `cantidad_cuotas_congelada` y
 * `periodicidad_congelada`).
 *
 * Desde T121 las condiciones de la venta viven en su PLANPAGO (1 a 1); las
 * columnas `*_congelado` de VENTA se siguen escribiendo pero ya no se leen,
 * salvo `periodicidad_congelada`, que no tiene equivalente en PLANPAGO.
 * Cualquier service que necesite una de estas condiciones usa
 * `CONDICIONES_VENTA_SELECT` + `resolverCondicionesVenta`, nunca las columnas
 * directamente.
 */
export const CONDICIONES_VENTA_SELECT = {
  id_venta: true,
  periodicidad_congelada: true,
  planPago: {
    select: {
      modalidad: true,
      precio_venta: true,
      anticipo_monto: true,
      cantidad_cuotas: true,
    },
  },
} as const satisfies Prisma.VENTASelect;

export type VentaConCondiciones = Prisma.VENTAGetPayload<{
  select: typeof CONDICIONES_VENTA_SELECT;
}>;

export interface CondicionesVenta {
  precio_congelado: Prisma.Decimal;
  anticipo_congelado: Prisma.Decimal;
  tipo_plan_congelado: ModalidadPago;
  cantidad_cuotas_congelada: number;
  periodicidad_congelada: Periodicidad | null;
}

/**
 * Invariante: toda venta tiene su plan de pago, porque nacen en la misma
 * transacción (`VentaService.crear`). Si falta es un dato inconsistente, no un
 * error del usuario: por eso es un 500 y no hay vuelta atrás a las columnas
 * legado.
 */
export function resolverCondicionesVenta(
  venta: VentaConCondiciones,
): CondicionesVenta {
  const { planPago } = venta;
  if (planPago === null) {
    throw new InternalServerErrorException(
      `La venta ${venta.id_venta} no tiene plan de pago`,
    );
  }

  return {
    precio_congelado: planPago.precio_venta,
    anticipo_congelado: planPago.anticipo_monto,
    tipo_plan_congelado: planPago.modalidad,
    // En CONTADO el plan de pago no lleva cantidad de cuotas; el contrato del
    // Sprint 3 exponía 1.
    cantidad_cuotas_congelada: planPago.cantidad_cuotas ?? 1,
    periodicidad_congelada: venta.periodicidad_congelada,
  };
}
