import { Prisma } from '../../../../generated/prisma/client';
import { DECIMALES } from '../../../common/constantes/decimales';

/**
 * Monto del anticipo a partir de su porcentaje sobre el precio de lista,
 * redondeado a dos decimales como el resto de los importes: `precio × % ÷ 100`.
 *
 * Única fórmula del proyecto para esta conversión: la usan los planes de
 * ejemplo (HU-22), la simulación y la confirmación de la venta (HU-27), y
 * tienen que dar exactamente el mismo anticipo para el mismo porcentaje.
 */
export function montoAnticipoDesdePorcentaje(
  precio: Prisma.Decimal,
  porcentaje: Prisma.Decimal,
): Prisma.Decimal {
  return precio.mul(porcentaje).div(100).toDecimalPlaces(DECIMALES);
}
