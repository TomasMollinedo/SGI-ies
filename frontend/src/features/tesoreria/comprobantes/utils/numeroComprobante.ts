/** Dígitos con los que se muestran el punto de venta y el número (formato AFIP). */
const DIGITOS_PUNTO_DE_VENTA = 4
const DIGITOS_NUMERO = 8

/**
 * El "número" que ve el usuario: letra + punto de venta + número, tal como lo
 * imprime el proveedor (ej. `A 0003-00000055`). El backend no lo devuelve
 * armado — son tres campos separados.
 */
export function formatearNumeroComprobante(comprobante: {
  letra: string
  punto_de_venta: number
  numero: number
}): string {
  const puntoDeVenta = String(comprobante.punto_de_venta).padStart(DIGITOS_PUNTO_DE_VENTA, '0')
  const numero = String(comprobante.numero).padStart(DIGITOS_NUMERO, '0')

  return `${comprobante.letra} ${puntoDeVenta}-${numero}`
}