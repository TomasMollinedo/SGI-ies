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

/**
 * Formatea una fecha "de negocio" (sin hora) como `dd/MM/yyyy`, tomando la
 * parte de fecha del string ISO tal cual, sin conversión de zona horaria.
 *
 * `formatearFecha` de `shared/utils` está pensada para timestamps reales
 * (`hora_creacion`, etc.) y los pasa a horario de Argentina — pero
 * `fecha_emision` / `fecha_vencimiento` (y la `fecha_emision` de una orden de
 * compra) viajan como medianoche UTC de la fecha elegida, y esa conversión les
 * resta un día.
 */
export function formatearFechaSinHora(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}