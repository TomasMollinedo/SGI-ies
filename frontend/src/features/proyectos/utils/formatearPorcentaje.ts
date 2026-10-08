const FORMATO_PORCENTAJE = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

/**
 * Formatea un porcentaje ya numérico con hasta 2 decimales (ej. 33.33 →
 * "33,33 %", 50 → "50 %"). El de `planes-pago/utils/decimal.ts` es otro: fija
 * siempre 2 decimales porque acompaña importes de un plan.
 */
export function formatearPorcentaje(valor: number): string {
  return `${FORMATO_PORCENTAJE.format(valor)} %`
}
