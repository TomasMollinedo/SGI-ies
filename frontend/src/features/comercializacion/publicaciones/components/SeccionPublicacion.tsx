import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

interface SeccionPublicacionProps {
  titulo: string
  children: ReactNode
  className?: string
}

/** Tarjeta con título de una sección del detalle de la publicación. */
export function SeccionPublicacion({ titulo, children, className }: SeccionPublicacionProps) {
  return (
    <section
      aria-label={titulo}
      className={cn(
        'bg-fondotabla border-subtle min-w-0 rounded-lg border p-4 shadow-md',
        className
      )}
    >
      <h2 className="text-content mb-2 text-base font-semibold">{titulo}</h2>
      {children}
    </section>
  )
}
