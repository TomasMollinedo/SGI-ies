/** Mínimo de dígitos del número. Un id más largo no se recorta: 1234 → TM-1234. */
const DIGITOS_CODIGO = 3

/**
 * Código que la UI muestra para un tipo de movimiento. El backend no lo
 * devuelve: se arma acá a partir del `id_tipo_movimiento` (1 → TM-001,
 * 42 → TM-042). Es solo para mostrar — los requests siguen viajando con el id.
 */
export function formatearCodigoTipoMovimiento(id: number): string {
  return `TM-${String(id).padStart(DIGITOS_CODIGO, '0')}`
}
