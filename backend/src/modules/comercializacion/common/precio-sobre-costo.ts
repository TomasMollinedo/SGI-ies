import { Prisma } from '../../../../generated/prisma/client';
import { DECIMALES } from '../../../common/constantes/decimales';

/**
 * Comparaciones de un precio contra el costo de la unidad (HU-20, HU-22).
 * Las usan el precio de lista de la publicación y, hasta T134, el precio
 * propio de cada plan de ejemplo.
 */

/**
 * Porcentaje de ganancia que representa `precio` sobre `costo`:
 * `(precio - costo) / costo * 100`, a dos decimales. Puede dar negativo si el
 * precio está por debajo del costo; cada llamador decide qué hace en ese caso.
 *
 * Con costo 0 no hay porcentaje definido (sería una división por cero, que
 * Decimal rechaza tirando error): devuelve `null`.
 */
export function porcentajeGananciaSobreCosto(
  precio: Prisma.Decimal,
  costo: Prisma.Decimal,
): Prisma.Decimal | null {
  if (costo.isZero()) {
    return null;
  }

  return precio.sub(costo).div(costo).mul(100).toDecimalPlaces(DECIMALES);
}

/**
 * Vender por debajo del costo se permite (puede ser una decisión comercial
 * deliberada), pero la respuesta lo avisa. No se guarda en ninguna columna:
 * es un dato del momento, y tanto el precio como el costo pueden cambiar.
 *
 * `etiqueta` es el sujeto del mensaje ("El precio de lista", "El precio del
 * plan"), para que el usuario sepa a qué precio se refiere.
 */
export function advertenciaPrecioMenorAlCosto(
  etiqueta: string,
  precio: Prisma.Decimal,
  costo: Prisma.Decimal,
): string | null {
  if (!precio.lessThan(costo)) {
    return null;
  }

  return `${etiqueta} (${precio.toFixed(DECIMALES)}) es menor al costo de la unidad (${costo.toFixed(DECIMALES)}).`;
}
