import { Prisma } from '../../../../generated/prisma/client';
import { ModalidadPago } from '../../../../generated/prisma/enums';
import { montoAnticipoDesdePorcentaje } from '../common/anticipo';
import { PlanPagoCalculado, calcularPlanPago } from '../plan-pago/motor-cuotas';

/**
 * Lo que define un plan de ejemplo (HU-22): el anticipo en porcentaje y el
 * plazo. El precio de lista y la TNA NO son del plan: se leen vigentes cada
 * vez que se muestra, así que si cambian, los importes cambian solos.
 */
export interface CondicionesPlanEjemplo {
  /** Precio de lista vigente de la publicación (precio de contado). */
  precio_lista: Prisma.Decimal;
  /** Mayor a 0 y menor a 100 (lo valida el DTO). */
  anticipo_porcentaje: Prisma.Decimal;
  /** Del plazo de financiación del plan. */
  cantidad_cuotas: number;
  /** Del plazo de financiación del plan, vigente. En porcentaje (24 = 24 %). */
  tasa_nominal_anual: Prisma.Decimal;
  /** Desde dónde se cuentan los vencimientos del cronograma. Por defecto, hoy. */
  fecha_venta?: Date;
}

/** El plan calculado más las condiciones con las que se calculó. */
export interface ImportesPlanEjemplo extends PlanPagoCalculado {
  precio_lista: Prisma.Decimal;
  anticipo_monto: Prisma.Decimal;
  cantidad_cuotas: number;
  tasa_nominal_anual: Prisma.Decimal;
}

/**
 * Importes de un plan de ejemplo: anticipo, saldo a financiar, cuota,
 * intereses, total a pagar y cronograma. No se guardan nunca (HU-22): se
 * calculan cada vez que el plan se muestra, con el mismo motor de sistema
 * francés que usa la venta, para que el ejemplo y la venta real den los
 * mismos números.
 *
 * Lo usan la pantalla interna de planes de ejemplo y, desde T140, el catálogo
 * público: los dos tienen que mostrar exactamente lo mismo.
 *
 * El anticipo se resuelve a monto redondeando a dos decimales, igual que el
 * resto de los importes; el saldo a financiar es el precio menos ese monto.
 */
export function calcularImportesPlanEjemplo(
  condiciones: CondicionesPlanEjemplo,
): ImportesPlanEjemplo {
  const {
    precio_lista: precioLista,
    anticipo_porcentaje: anticipoPorcentaje,
    cantidad_cuotas: cantidadCuotas,
    tasa_nominal_anual: tasaNominalAnual,
  } = condiciones;

  const anticipoMonto = montoAnticipoDesdePorcentaje(
    precioLista,
    anticipoPorcentaje,
  );

  const plan = calcularPlanPago({
    precio: precioLista,
    tipo: ModalidadPago.FINANCIADO,
    anticipo_monto: anticipoMonto,
    cantidad_cuotas: cantidadCuotas,
    tasa_nominal_anual: tasaNominalAnual,
    fecha_venta: condiciones.fecha_venta ?? new Date(),
  });

  return {
    precio_lista: precioLista,
    anticipo_monto: anticipoMonto,
    cantidad_cuotas: cantidadCuotas,
    tasa_nominal_anual: tasaNominalAnual,
    ...plan,
  };
}
