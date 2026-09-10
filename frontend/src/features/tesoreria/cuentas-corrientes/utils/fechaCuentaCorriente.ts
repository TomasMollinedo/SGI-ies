/** Hoy en formato `YYYY-MM-DD`, en horario local — para comparar contra fechas "de negocio". */
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
 * (`hora_creacion`, etc.) y los pasa a horario de Argentina — pero `fecha`,
 * `fecha_vencimiento` y `vencimiento_mas_antiguo` viajan como medianoche UTC
 * del día elegido, y esa conversión les resta un día. Mismo criterio que
 * `formatearFechaSinHora` en Comprobantes y en Órdenes de Compra.
 */
export function formatearFechaSinHora(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}
