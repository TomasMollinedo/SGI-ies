/**
 * Hoy en formato `YYYY-MM-DD` — lo que devuelve y acepta un `<input type="date">`
 * y lo que el backend espera para `fecha_emision` / `fecha_vencimiento`
 * (`fechaIsoSchema` acepta la fecha sola, sin hora). Mismo criterio que
 * `hoyIso` en la feature de órdenes de compra.
 */
export function hoyIso(): string {
  const hoy = new Date()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')

  return `${hoy.getFullYear()}-${mes}-${dia}`
}