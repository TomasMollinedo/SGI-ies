/** Dos decimales como máximo, los de la columna `Decimal(5, 2)` de la TNA. */
const FORMATO_TNA = /^\d+([.,]\d{1,2})?$/

/** Decimales con los que se muestra la TNA. */
export const DECIMALES_TNA = 2

/** Decimales con los que el backend devuelve la tasa mensual (TNA ÷ 12). */
export const DECIMALES_TASA_MENSUAL = 4

/**
 * Lo que escribió el usuario en el campo TNA, a número. Acepta la coma como
 * separador decimal (es lo que se escribe en es-AR). Vacío, a medio escribir o
 * con más de dos decimales dan `null`: el formulario lo trata como "todavía no
 * hay una TNA válida" y no muestra tasa mensual.
 */
export function aTnaNumero(texto: string): number | null {
  const limpio = texto.trim()
  if (!FORMATO_TNA.test(limpio)) return null

  return Number(limpio.replace(',', '.'))
}

/**
 * Tasa mensual para mostrar en vivo: TNA ÷ 12. Es el mismo dato que el backend
 * devuelve en `tasa_mensual`, pero calculado mientras se tipea; el que manda es
 * el del backend, y el cálculo de cuotas parte de la TNA, no de este valor.
 */
export function calcularTasaMensual(tna: number): number {
  return tna / 12
}

/**
 * Un decimal del backend (string, siempre numérico) o un número, a "12,50 %"
 * (es-AR).
 */
export function formatearTasa(valor: string | number, decimales: number): string {
  const formato = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })

  return `${formato.format(Number(valor))} %`
}

/** Un decimal del backend a lo que se carga en el campo TNA al editar ("18.50" → "18,50"). */
export function tnaATexto(valor: string): string {
  return valor.replace('.', ',')
}
