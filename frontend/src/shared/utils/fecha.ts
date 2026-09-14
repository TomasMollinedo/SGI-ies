import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const ZONA_HORARIA = 'America/Argentina/Buenos_Aires'
const LOCALE = 'es-AR'

function aObjetoFecha(fecha: string | Date): Date {
  return typeof fecha === 'string' ? new Date(fecha) : fecha
}

/** Formatea una fecha (ISO del backend o Date) como dd/MM/yyyy en horario de Argentina. */
export function formatearFecha(fecha: string | Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: ZONA_HORARIA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(aObjetoFecha(fecha))
}

/** Formatea una fecha (ISO del backend o Date) como dd/MM/yyyy HH:mm en horario de Argentina. */
export function formatearFechaHora(fecha: string | Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: ZONA_HORARIA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(aObjetoFecha(fecha))
}

/** Formatea una fecha como texto relativo (ej. "hace 2 horas"). */
export function formatearFechaRelativa(fecha: string | Date): string {
  return formatDistanceToNow(aObjetoFecha(fecha), { addSuffix: true, locale: es })
}

/** Hoy en formato `YYYY-MM-DD`, en horario local — lo que devuelve y acepta un `<input type="date">`. */
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
 * `formatearFecha` está pensada para timestamps reales (`hora_creacion`, etc.)
 * y los pasa a horario de Argentina — pero una fecha de negocio (`fecha_emision`,
 * `fecha_vencimiento`, `vencimiento_mas_antiguo`, etc.) viaja como medianoche
 * UTC del día elegido, y esa conversión le resta un día.
 */
export function formatearFechaSinHora(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}
