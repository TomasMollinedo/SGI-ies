const FORMATO_ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

/** Formatea un importe como moneda argentina (ej. 1234.5 → "$ 1.234,50"). */
export function formatearImporte(importe: number): string {
  return FORMATO_ARS.format(importe)
}
