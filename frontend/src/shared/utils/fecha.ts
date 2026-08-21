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
