/**
 * Código que la UI muestra para una categoría. El backend no lo devuelve: se
 * arma acá a partir del `id_categoria` (1 → CAT-1, 42 → CAT-42). Es solo para
 * mostrar — los requests siguen viajando con el id.
 */
export function formatearCodigoCategoria(id: number): string {
  return `CAT-${id}`
}
