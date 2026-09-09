/** Mínimo de dígitos del número. Un id más largo no se recorta: 1234 → FP-1234. */
const DIGITOS_CODIGO = 3

/**
 * Código que la UI muestra para una forma de pago. El backend no lo devuelve:
 * se arma acá a partir del `id_forma_pago` (1 → FP-001, 42 → FP-042). Es solo
 * para mostrar — los requests siguen viajando con el id.
 */
export function formatearCodigoFormaPago(id: number): string {
  return `FP-${String(id).padStart(DIGITOS_CODIGO, '0')}`
}
