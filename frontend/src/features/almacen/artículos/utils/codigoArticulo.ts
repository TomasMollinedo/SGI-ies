/**
 * Código que la UI muestra para un artículo. El backend no lo devuelve: se
 * arma acá a partir del `id_articulo` (1 → COD-1, 42 → COD-42). Es solo para
 * mostrar — los requests siguen viajando con el id.
 */
export function formatearCodigoArticulo(id: number): string {
  return `ART-${id}`
}
