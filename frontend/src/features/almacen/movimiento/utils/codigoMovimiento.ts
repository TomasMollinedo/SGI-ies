/**
 * Código que la UI muestra para un movimiento. El backend no lo devuelve: se
 * arma acá a partir del `id_movimiento` (1 → MOV-1, 42 → MOV-42). Es solo para
 * mostrar — los requests siguen viajando con el id.
 */
export function formatearCodigoMovimiento(id: number): string {
  return `MOV-${id}`
}
