/**
 * Importe tipeado como se escribe en es-AR: coma para los decimales (hasta
 * dos) y punto, opcional, para separar los miles de a tres dígitos. Acepta
 * "1600000", "1.600.000", "1600000,50" y "1.600.000,50".
 *
 * Un punto que no separa miles de a tres ("1500.50", "1.5") se rechaza en vez
 * de adivinar: leerlo como separador de miles convertiría $1.500,50 en
 * $150.050, y leerlo como decimal contradice la convención — cualquiera de
 * los dos errores cambia el monto sin que el cliente se entere.
 */
const FORMATO_IMPORTE_AR = /^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/

/** `true` si el texto es un importe válido en formato es-AR (ver `FORMATO_IMPORTE_AR`). */
export function tieneFormatoImporteAr(texto: string): boolean {
  return FORMATO_IMPORTE_AR.test(texto.trim())
}

/** El texto en formato es-AR convertido a número, o `null` si no es un importe válido. */
export function interpretarImporteAr(texto: string): number | null {
  const limpio = texto.trim()
  if (!FORMATO_IMPORTE_AR.test(limpio)) return null
  return Number(limpio.replaceAll('.', '').replace(',', '.'))
}
