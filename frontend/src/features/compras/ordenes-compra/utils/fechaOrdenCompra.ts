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

/**
 * Formatea `fecha_emision` / `fecha_entrega_solicitada` como `dd/MM/yyyy`,
 * tomando la parte de fecha del string ISO tal cual, sin conversión de zona
 * horaria.
 *
 * `formatearFecha` de `shared/utils` está pensada para timestamps reales
 * (`hora_creacion`, etc.) y los pasa a horario de Argentina — pero estas
 * fechas viajan como medianoche UTC del día elegido, y esa conversión les
 * resta un día. Mismo criterio que `formatearFechaSinHora` en Comprobantes.
 */
export function formatearFechaSinHora(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}
