import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

export type BadgeVariant = 'active' | 'inactive'

interface BadgeProps {
  variant: BadgeVariant
  dot?: boolean
  children: ReactNode
  className?: string
}

/**
 * Pastilla chica de estado, para la columna "Estado" de las tablas.
 *
 * Es puramente presentacional: no tiene click, ni hover, ni estados. Solo
 * pinta un texto con el color de su variante.
 *
 * Props:
 * - `variant`: `'active'` (verde de success) o `'inactive'` (gris neutro).
 * - `dot`: punto de color a la izquierda del texto. Default: `true`.
 * - `children`: el texto de la pastilla.
 * - `className`: clases extra.
 *
 * Para sumar una variante alcanza con agregar una entrada a
 * `CLASES_VARIANTE` y un valor a `BadgeVariant`: la lógica no se toca.
 */
export function Badge({ variant, dot = true, children, className }: BadgeProps) {
  const estilos = CLASES_VARIANTE[variant]

  return (
    <span className={cn(CLASES_BASE, estilos.pastilla, className)}>
      {dot && (
        <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', estilos.punto)} />
      )}
      {children}
    </span>
  )
}

const CLASES_BASE =
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap'

const CLASES_VARIANTE: Record<BadgeVariant, { pastilla: string; punto: string }> = {
  active: { pastilla: 'bg-success-soft text-success', punto: 'bg-success' },
  inactive: { pastilla: 'bg-neutral-soft text-content-muted', punto: 'bg-neutral' },
}
