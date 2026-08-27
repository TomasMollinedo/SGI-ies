/**
 * Código que la UI muestra para una ficha de stock. El backend no lo
 * devuelve: se arma acá a partir del `id_stock` (1 → STK-1, 42 → STK-42). Es
 * solo para mostrar — los requests siguen viajando con el id.
 */
export function formatearCodigoStock(id: number): string {
  return `STK-${id}`
}
