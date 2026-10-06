import { Prisma } from '../../../../generated/prisma/client';
import { CuotaGenerada } from './motor-cuotas';

/**
 * Una cuota del cronograma con el desglose que guarda `CUOTA` desde T121:
 * capital, interés y saldo de capital del plan después de esa cuota.
 */
export interface CuotaConDesglose extends CuotaGenerada {
  importe_capital: Prisma.Decimal;
  importe_interes: Prisma.Decimal;
  saldo_capital: Prisma.Decimal;
}

/**
 * Completa el desglose de un cronograma SIN interés (TNA 0 %), que es el
 * reparto en partes iguales de `generarCuotas`: toda la cuota es capital.
 *
 * - `importe_capital` = `importe` e `importe_interes` = 0.
 * - `saldo_capital` = `precioVenta` − suma de importes hasta esa cuota
 *   inclusive. Así la cuota 0 queda con el saldo a financiar (o con el precio
 *   completo, si el anticipo es 0) y la última en 0.
 *
 * Función pura, a propósito separada de `generarCuotas`: la usan la venta y
 * los seeds. Las cuotas tienen que venir ordenadas por `numero`, como las
 * devuelve el motor.
 */
export function completarDesgloseTasaCero(
  cuotas: CuotaGenerada[],
  precioVenta: Prisma.Decimal,
): CuotaConDesglose[] {
  let acumulado = new Prisma.Decimal(0);

  return cuotas.map((cuota) => {
    const importe = new Prisma.Decimal(cuota.importe);
    acumulado = acumulado.add(importe);

    return {
      ...cuota,
      importe,
      importe_capital: importe,
      importe_interes: new Prisma.Decimal(0),
      saldo_capital: new Prisma.Decimal(precioVenta).sub(acumulado),
    };
  });
}
