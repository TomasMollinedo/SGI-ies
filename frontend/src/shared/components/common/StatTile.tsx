import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

interface StatTileProps {
  label: string
  value: ReactNode
  note?: string
  /** Clases extra para el valor, ej. un color según su signo. */
  valueClassName?: string
  /** Clases extra para la tarjeta, ej. alinear verticalmente entre tiles de distinta altura. */
  className?: string
}

/**
 * Tarjeta de un solo número: etiqueta arriba, valor grande, nota opcional
 * abajo. Para las cards de resumen de un listado o de una ficha (ej. cardex de
 * stock, cuentas corrientes de proveedores).
 */
export function StatTile({ label, value, note, valueClassName, className }: StatTileProps) {
  return (
    <div className={cn('bg-fondotabla border-subtle rounded-lg border p-4 shadow-md', className)}>
      <dl>
        <dt className="text-content-muted text-xs font-medium uppercase">{label}</dt>
        <dd className={cn('text-content mt-1 text-3xl font-semibold', valueClassName)}>{value}</dd>
      </dl>
      {note && <p className="text-content-muted mt-1 text-xs">{note}</p>}
    </div>
  )
}
