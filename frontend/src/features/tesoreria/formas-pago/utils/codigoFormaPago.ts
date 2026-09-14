/**
 * Código que la UI muestra para una forma de pago. El backend no lo devuelve:
 * se arma acá a partir del `id_forma_pago` (1 → FP-1, 42 → FP-42). Sin relleno
 * de ceros, igual que Artículos, Marcas, Categorías, Unidades de Medida,
 * Depósitos, Stock y Movimientos. Es solo para mostrar — los requests siguen
 * viajando con el id.
 */
export function formatearCodigoFormaPago(id: number): string {
  return `FP-${id}`
}
