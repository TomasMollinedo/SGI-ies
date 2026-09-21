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

/**
 * El porcentaje de ganancia que queda implícito cuando se escribe el precio a
 * mano: `(precio - costo) / costo * 100`.
 *
 * Es el mismo cálculo que hace `PlanPagoService.calcularGananciaImplicita`, y
 * se muestra bajo las mismas condiciones con las que el backend lo devuelve:
 * solo si no se cargaron ni porcentaje ni margen, y solo si el costo no es 0
 * (sería una división por cero).
 */
export function calcularGananciaImplicita(
  costo: number | null,
  precio: number | null
): number | null {
  if (costo === null || costo === 0 || precio === null) return null

  return redondearDosDecimales(((precio - costo) / costo) * 100)
}
