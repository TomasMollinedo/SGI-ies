/**
 * Hoy en formato `YYYY-MM-DD` — lo que devuelve y acepta un `<input type="date">`
 * y lo que el backend espera para `fecha_pago`. Mismo criterio que `hoyIso` en
 * comprobantes y órdenes de compra.
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
 * `fecha_emision` / `fecha_vencimiento` de un comprobante imputable viajan
 * como medianoche UTC de la fecha elegida: convertirlas a horario de
 * Argentina les restaría un día. Mismo criterio que `formatearFechaSinHora`
 * en comprobantes.
 */
export function formatearFechaSinHora(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}
