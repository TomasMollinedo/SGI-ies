/**
 * Tokens del theme (`--color-*`) que pueden usar los gráficos. Se pasan por
 * nombre y no como color literal: así los gráficos siguen la paleta del
 * proyecto y no hay hexadecimales en los componentes.
 */
export type GraficoColor =
  'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral' | 'reactivar'

export function colorGrafico(color: GraficoColor): string {
  return `var(--color-${color})`
}

/** Estilo del tooltip de Recharts, con los mismos tokens que las tarjetas del resto de la app. */
export const ESTILO_TOOLTIP = {
  backgroundColor: 'var(--color-fondotabla)',
  border: '1px solid var(--color-subtle)',
  borderRadius: '0.5rem',
  fontSize: 'var(--text-xs)',
  color: 'var(--color-content)',
} as const
