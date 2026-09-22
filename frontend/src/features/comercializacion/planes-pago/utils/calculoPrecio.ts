import { redondearDosDecimales } from './decimal'

/**
 * Las dos cuentas de ayuda del formulario de plan de pago. Las dos son
 * INFORMATIVAS: se recalculan mientras el usuario tipea, no se mandan al
 * backend y no son la fuente de verdad de nada.
 *
 * El precio que se guarda es siempre el que haya en el campo `precio`, lo
 * escriba el usuario a mano o lo copie desde la sugerencia. El backend
 * recalcula su propia versión con `Prisma.Decimal` al guardar, así que puede
 * diferir en milésimas por redondeo — es esperable.
 *
 * Nada de esto tiene que ver con el cronograma de cuotas: ese sale siempre de
 * `POST /planes-pago/simular-cuotas`, nunca de una fórmula del frontend.
 */

/**
 * El precio sugerido: `costo + costo * porcentaje / 100 + margen`, la misma
 * fórmula que documenta `PLANPAGO` en el schema del backend.
 *
 * Devuelve `null` si no hay costo conocido, o si el usuario todavía no cargó
 * ni porcentaje ni margen (sugerir el costo pelado no le aporta nada).
 */
export function calcularPrecioSugerido(
  costo: number | null,
  porcentajeGanancia: number | null,
  margen: number | null
): number | null {
  if (costo === null) return null
  if (porcentajeGanancia === null && margen === null) return null

  const porcentaje = porcentajeGanancia ?? 0
  const margenFinal = margen ?? 0

  return redondearDosDecimales(costo + (costo * porcentaje) / 100 + margenFinal)
}

/** Lo que un precio representa de ganancia sobre el costo, en porcentaje y en pesos. */
export interface ResultadoSobreCosto {
  porcentaje: number
  margen: number
}

/**
 * Lo que el precio actual de este plan representa sobre el costo, en vivo:
 * `(precio - costo) / costo * 100` y `precio - costo`.
 *
 * A diferencia de `porcentaje_ganancia_implicito` del backend (que solo se
 * calcula, y se guarda como referencia, cuando no se cargaron ni porcentaje
 * ni margen), esto se recalcula siempre que hay costo y precio, se hayan
 * usado o no las herramientas de cálculo: sirve para ver el efecto real de
 * cualquier ajuste manual, incluso si el usuario pisó el precio sugerido con
 * otro número. Es puramente informativo del cliente, nunca se manda al
 * backend.
 */
export function calcularResultadoSobreCosto(
  costo: number | null,
  precio: number | null
): ResultadoSobreCosto | null {
  if (costo === null || costo === 0 || precio === null) return null

  return {
    porcentaje: redondearDosDecimales(((precio - costo) / costo) * 100),
    margen: redondearDosDecimales(precio - costo),
  }
}
