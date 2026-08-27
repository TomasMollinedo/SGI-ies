/**
 * Código que la UI muestra para un depósito/obrador. El backend no lo
 * devuelve: se arma acá a partir del `id_deposito` (1 → CEN-1, 42 → CEN-42).
 * Depósitos centrales y obradores son la misma entidad — comparten la
 * secuencia de ids — así que el prefijo es uno solo, "CEN" de "centro de
 * acopio", sin distinguir el tipo. Es solo para mostrar — los requests siguen
 * viajando con el id.
 */
export function formatearCodigoDeposito(id: number): string {
  return `CEN-${id}`
}
