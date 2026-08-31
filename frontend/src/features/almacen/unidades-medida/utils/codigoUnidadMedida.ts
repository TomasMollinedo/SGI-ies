/**
 * Código que la UI muestra para una unidad de medida. El backend no lo
 * devuelve: se arma acá a partir del `id_unidad_medida` (1 → UM-1, 42 →
 * UM-42). Es solo para mostrar — los requests siguen viajando con el id.
 */
export function formatearCodigoUnidadMedida(id: number): string {
  return `UM-${id}`
}
