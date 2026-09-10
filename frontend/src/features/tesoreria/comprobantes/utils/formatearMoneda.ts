const FORMATO_MONEDA = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

/**
 * Formatea un importe como pesos argentinos (ej. `3112000` → `"$ 3.112.000,00"`).
 * Copia local de la utilidad de órdenes de compra — con esto son dos usos, así
 * que es candidata a `shared/utils/`; se deja local hasta acordar la promoción.
 */
export function formatearMoneda(valor: number): string {
  return FORMATO_MONEDA.format(valor)
}