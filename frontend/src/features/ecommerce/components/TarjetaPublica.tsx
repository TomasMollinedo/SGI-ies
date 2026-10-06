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
 * Tarjeta de las pantallas del cliente (perfil, datos personales). Usa el mismo
 * lenguaje que las tarjetas de la landing: bordes rectos, línea terracota
 * arriba, borde fino y fondo un tono más oscuro que la página.
 *
 * El título es el `<h1>` de la pantalla, así que cada página monta una sola.
 */
export function TarjetaPublica({ icon, title, footer, className, children }: TarjetaPublicaProps) {
  return (
    <section className={cn('bg-dark-deep border-light/15 mx-auto w-full border', className)}>
      <span aria-hidden="true" className="bg-primary block h-1 w-full" />

      <header className="border-light/10 flex items-center gap-4 border-b px-6 py-5">
        <span
          aria-hidden="true"
          className="border-secondary text-secondary inline-flex size-10 shrink-0 items-center justify-center border [&>svg]:size-5"
        >
          {icon}
        </span>
        <h1 className="text-titulo-modal text-light flex-1 font-bold tracking-tight">{title}</h1>
      </header>

      <div className="text-light px-6 py-6">{children}</div>

      {footer && (
        <footer className="border-light/10 flex flex-wrap items-center justify-end gap-3 border-t px-6 py-5">
          {footer}
        </footer>
      )}
    </section>
  )
}
