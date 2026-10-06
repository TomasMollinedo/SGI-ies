import { InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { ModalidadPago } from '../../../../generated/prisma/enums';

/**
 * El plan de pago acordado en la venta (HU-27, HU-28), leído de su PLANPAGO:
 * las condiciones que quedaron congeladas al confirmar, más los totales que
 * se derivan del cronograma (el DER no los guarda: saldo financiado =
 * precio − anticipo; total de intereses = suma del interés de las cuotas).
 *
 * Nunca lee el plan de ejemplo con el que se registró la venta: desde el
 * Sprint 4 una venta puede no tener ninguno (T158).
 */
export const PLAN_ACORDADO_SELECT = {
  id_venta: true,
  planPago: {
    select: {
      modalidad: true,
      precio_venta: true,
      anticipo_monto: true,
      cantidad_cuotas: true,
      tasa_nominal_anual: true,
      valor_cuota: true,
    },
  },
} as const satisfies Prisma.VENTASelect;

type VentaConPlanAcordado = Prisma.VENTAGetPayload<{
  select: typeof PLAN_ACORDADO_SELECT;
}>;

export interface PlanAcordado {
  modalidad: ModalidadPago;
  precio: Prisma.Decimal;
  /** En CONTADO, el precio completo. */
  anticipo: Prisma.Decimal;
  /** precio − anticipo; 0 en CONTADO. */
  saldo_financiado: Prisma.Decimal;
  /** `null` en CONTADO (una única cuota 0). */
  cantidad_cuotas: number | null;
  /** En porcentaje (24 = 24 %); `null` en CONTADO. */
  tasa_nominal_anual: Prisma.Decimal | null;
  /** `null` en CONTADO. */
  valor_cuota: Prisma.Decimal | null;
  total_intereses: Prisma.Decimal;
  /** precio + intereses. */
  total_a_pagar: Prisma.Decimal;
}

/**
 * Arma el plan acordado de una venta. `cuotas` son las del cronograma del
 * plan (sin las ANULADA de una venta cancelada): de ahí sale el total de
 * intereses.
 *
 * Invariante: toda venta tiene su plan de pago, porque nacen en la misma
 * transacción. Si falta es un dato inconsistente, no un error del usuario:
 * por eso es un 500.
 */
export function resolverPlanAcordado(
  venta: VentaConPlanAcordado,
  cuotas: { importe_interes: Prisma.Decimal }[],
): PlanAcordado {
  const { planPago } = venta;
  if (planPago === null) {
    throw new InternalServerErrorException(
      `La venta ${venta.id_venta} no tiene plan de pago`,
    );
  }

  const totalIntereses = cuotas.reduce(
    (acumulado, cuota) => acumulado.add(cuota.importe_interes),
    new Prisma.Decimal(0),
  );

  return {
    modalidad: planPago.modalidad,
    precio: planPago.precio_venta,
    anticipo: planPago.anticipo_monto,
    saldo_financiado: planPago.precio_venta.sub(planPago.anticipo_monto),
    cantidad_cuotas: planPago.cantidad_cuotas,
    tasa_nominal_anual: planPago.tasa_nominal_anual,
    valor_cuota: planPago.valor_cuota,
    total_intereses: totalIntereses,
    total_a_pagar: planPago.precio_venta.add(totalIntereses),
  };
}
