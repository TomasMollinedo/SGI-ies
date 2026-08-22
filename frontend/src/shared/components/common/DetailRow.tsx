import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

interface DetailRowProps {
  label: string
  value: ReactNode
  className?: string
}

/**
 * Una fila de las pantallas de detalle: etiqueta a la izquierda, valor a la
 * derecha, con una divisoria fina abajo.
 *
 * Props:
 * - `label`: la etiqueta. Se muestra en mayúsculas y atenuada.
 * - `value`: `ReactNode` y no `string` a propósito, porque a veces el valor es
 *   un componente — por ejemplo un `Badge` en el campo "Estado".
 * - `className`: clases extra para la fila.
 *
 * La última fila de un grupo no muestra divisoria: lo resuelve `last:border-b-0`,
 * así que alcanza con envolver varias en un mismo contenedor, sin pasarle nada.
 *
 * En pantallas angostas la etiqueta y el valor se apilan en dos líneas; desde
 * `sm` van uno a cada lado.
 */
export function DetailRow({ label, value, className }: DetailRowProps) {
  return (
    <div
      className={cn(
        'border-subtle flex flex-col gap-1 border-b py-3 last:border-b-0',
        'sm:flex-row sm:items-center sm:justify-between sm:gap-6',
        className
      )}
    >
      <span className="text-content-muted text-xs font-medium uppercase">{label}</span>
      <span className="text-content text-sm sm:text-right">{value}</span>
    </div>
  )
}
