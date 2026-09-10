/**
 * A diferencia de Movimiento, la fecha de una orden de compra no lleva hora:
 * el backend acepta `YYYY-MM-DD` tal cual (`fechaIsoSchema`), que es
 * exactamente el formato que devuelve un `<input type="date">`. No hace
 * falta ninguna conversión a ISO con offset.
 */
export function hoyIso(): string {
  const hoy = new Date()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')

  return `${hoy.getFullYear()}-${mes}-${dia}`
}
