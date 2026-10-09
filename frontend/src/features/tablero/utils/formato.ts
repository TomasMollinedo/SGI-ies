import { formatearImporte } from '@/shared/utils/importe'

const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
]

/**
 * La etiqueta del backend ("2026-03", "2026-T1", "2026") → el texto de la
 * pantalla ("mar 2026", "T1 2026", "2026"). Si llega un formato que no
 * reconoce, la muestra tal cual.
 */
export function formatearEtiquetaPeriodo(etiqueta: string): string {
  const mes = /^(\d{4})-(\d{2})$/.exec(etiqueta)
  if (mes) return `${MESES_CORTOS[Number(mes[2]) - 1] ?? mes[2]} ${mes[1]}`

  const trimestre = /^(\d{4})-(T\d)$/.exec(etiqueta)
  if (trimestre) return `${trimestre[2]} ${trimestre[1]}`

  return etiqueta
}

const FORMATO_PORCENTAJE = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
})

/**
 * Importe con el signo siempre explícito: "+$ 1.500,00", "−$ 300,00", "$ 0,00".
 * Usa el signo menos tipográfico (U+2212), que se lee más claro que el guion.
 */
export function formatearImporteConSigno(importe: number): string {
  if (importe === 0) return formatearImporte(0)

  const absoluto = formatearImporte(Math.abs(importe))
  return importe > 0 ? `+${absoluto}` : `−${absoluto}`
}

/** "+12,5 %", "−3,0 %" o "0,0 %". */
export function formatearVariacion(porcentaje: number): string {
  if (porcentaje === 0) return `${FORMATO_PORCENTAJE.format(0)} %`

  const absoluto = FORMATO_PORCENTAJE.format(Math.abs(porcentaje))
  return porcentaje > 0 ? `+${absoluto} %` : `−${absoluto} %`
}

/** Color de un importe según su signo (el signo en el texto es lo que lo identifica; el color acompaña). */
export function claseColorResultado(importe: number | null): string {
  if (importe === null || importe === 0) return 'text-content'
  return importe > 0 ? 'text-success' : 'text-error'
}

export type SentidoFavorable = 'sube' | 'baja'

/**
 * Clase de color de una variación: verde si va en el sentido que le conviene a
 * la empresa. Para los ingresos y el resultado conviene que suban; para los
 * egresos, que bajen.
 */
export function claseColorVariacion(porcentaje: number, favorable: SentidoFavorable): string {
  if (porcentaje === 0) return 'text-content-muted'
  return porcentaje > 0 === (favorable === 'sube') ? 'text-success' : 'text-error'
}
