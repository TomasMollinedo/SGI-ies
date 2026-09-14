/** Mínimo de dígitos del número. Un id más largo no se recorta: 1234 → TC-1234. */
const DIGITOS_CODIGO = 3

/**
 * Código que la UI muestra para un tipo de comprobante. El backend no lo
 * devuelve: se arma acá a partir del `id_tipo_comprobante` (1 → TC-001,
 * 42 → TC-042). Es solo para mostrar — los requests siguen viajando con el id.
 */
export function formatearCodigoTipoComprobante(id: number): string {
  return `TC-${String(id).padStart(DIGITOS_CODIGO, '0')}`
}
