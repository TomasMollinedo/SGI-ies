const FORMATO_MONEDA = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

/** Formatea un importe como pesos argentinos (ej. `3112000` → `"$ 3.112.000,00"`). */
export function formatearMoneda(valor: number): string {
  return FORMATO_MONEDA.format(valor)
}
