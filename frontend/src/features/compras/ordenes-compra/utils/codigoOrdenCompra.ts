/**
 * Código que la UI muestra para una orden de compra. El backend no lo
 * devuelve: se arma acá a partir del `id_orden_compra` (1 → OC-1, 42 → OC-42).
 * Es solo para mostrar — los requests siguen viajando con el id.
 */
export function formatearCodigoOrdenCompra(id: number): string {
  return `OC-${id}`
}
