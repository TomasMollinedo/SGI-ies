/**
 * Código que la UI muestra para un cobro. El backend no lo devuelve: se arma
 * acá a partir del `id_cobro` (1 → COBRO-1, 42 → COBRO-42), mismo criterio
 * que `formatearCodigoPago` — es el mismo id que identifica al recibo. Es
 * solo para mostrar: los requests siguen viajando con el id.
 */
export function formatearCodigoCobro(id: number): string {
  return `COBRO-${id}`
}
