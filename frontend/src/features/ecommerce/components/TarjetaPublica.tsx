import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

interface TarjetaPublicaProps {
  icon: ReactNode
  title: string
  footer?: ReactNode
  className?: string
  children: ReactNode
}

/**
 * Tarjeta de las pantallas del cliente: misma anatomía que los modales del
 * panel interno (franja oscura con ícono y título, cuerpo, pie con acciones),
 * pero como página y no como diálogo.
 */
export function TarjetaPublica({ icon, title, footer, className, children }: TarjetaPublicaProps) {
  return (
    <section
      className={cn('bg-fondotabla mx-auto w-full overflow-hidden rounded-lg shadow-xl', className)}
    >
      <header className="bg-dark text-light flex items-center gap-3 px-6 py-4">
        <span
          aria-hidden="true"
          className="inline-flex size-6 shrink-0 items-center justify-center [&>svg]:size-full"
        >
          {icon}
        </span>
        <h1 className="text-subtitulo flex-1">{title}</h1>
      </header>

      <div className="text-content px-6 py-5">{children}</div>

      {footer && (
        <footer className="border-subtle flex items-center justify-end gap-3 border-t px-6 py-4">
          {footer}
        </footer>
      )}
    </section>
  )
}
