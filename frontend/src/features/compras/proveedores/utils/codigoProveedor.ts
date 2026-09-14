/**
 * Código que la UI muestra para un proveedor. El backend no lo devuelve: se
 * arma acá a partir del `id_proveedor` (1 → PROV-1, 42 → PROV-42). Es solo
 * para mostrar — los requests siguen viajando con el id.
 */
export function formatearCodigoProveedor(id: number): string {
  return `PROV-${id}`
}
