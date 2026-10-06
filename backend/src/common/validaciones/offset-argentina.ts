/**
 * Offset fijo de Argentina respecto de UTC, en horas (UTC-3, sin horario de
 * verano). Se fija a mano y no se lee de la zona horaria del proceso de Node,
 * para que ningún resultado dependa de en qué servidor corra el backend.
 *
 * Es la única fuente del offset: las variantes de abajo salen de acá, para
 * que el ancla de las fechas de entrada (`fechaIsoSchema`) y el "hoy" de
 * `calcularDiasVencido` no puedan desalinearse.
 */
export const OFFSET_ARGENTINA_HORAS = -3;

/** El mismo offset en milisegundos, para sumárselo a un `Date`. */
export const OFFSET_ARGENTINA_MS = OFFSET_ARGENTINA_HORAS * 60 * 60 * 1000;

/** El mismo offset como sufijo ISO 8601 (`'-03:00'`). */
export const OFFSET_ARGENTINA_ISO = `${OFFSET_ARGENTINA_HORAS < 0 ? '-' : '+'}${String(
  Math.abs(OFFSET_ARGENTINA_HORAS),
).padStart(2, '0')}:00`;
