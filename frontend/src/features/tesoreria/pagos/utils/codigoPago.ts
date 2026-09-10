/**
 * Código que la UI muestra para un pago. El backend no lo devuelve: se arma
 * acá a partir del `id_pago` (1 → PAGO-1, 42 → PAGO-42) — es el mismo id que
 * identifica al documento imprimible ("orden de pago"). Es solo para mostrar —
 * los requests siguen viajando con el id.
 */
export function formatearCodigoPago(id: number): string {
  return `PAGO-${id}`
}
