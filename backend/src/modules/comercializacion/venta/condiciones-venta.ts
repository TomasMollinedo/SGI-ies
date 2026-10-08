import { InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import {
  ModalidadPago,
  Periodicidad,
} from '../../../../generated/prisma/enums';

/**
 * Código de transición del Sprint 3: traduce el PLANPAGO de una venta a las
 * "condiciones congeladas" con los nombres del contrato viejo
 * (`precio_congelado`, `anticipo_congelado`, `tipo_plan_congelado`,
 * `cantidad_cuotas_congelada` y `periodicidad_congelada`).
 *
 * Desde T158 el único que lo usa es `DeclaracionPagoService` (para saber si
 * la venta es de contado); las ventas ya exponen su plan con
 * `plan-acordado.ts`. Las ventas nuevas no escriben las columnas `*_congelado`
 * de VENTA, así que `periodicidad_congelada` viene en `null` para ellas. Se
 * elimina en T159.
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
