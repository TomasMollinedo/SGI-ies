import type { MouseEventHandler, ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/shared/utils/cn'

interface LinkButtonProps {
  to: string
  icon?: ReactNode
  onClick?: MouseEventHandler<HTMLAnchorElement>
  className?: string
  children: ReactNode
}

/**
 * Enlace con la apariencia del `Button` primary/md del design system. Existe
 * porque un `<button>` dentro de un `<a>` no es HTML válido y `Button` no
 * puede renderizarse como enlace; si se necesita más de una variante, lo
 * correcto es extraer estas clases a `shared/`.
 */
export function LinkButton({ to, icon, onClick, className, children }: LinkButtonProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'bg-primary text-primary-content inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium whitespace-nowrap transition-colors',
        'hover:bg-[color-mix(in_srgb,var(--color-primary)_85%,var(--color-light))]',
        'focus-visible:outline-content focus-visible:outline-2 focus-visible:outline-offset-2',
        className
      )}
    >
      {icon && (
        <span
          aria-hidden="true"
          className="inline-flex size-5 shrink-0 items-center justify-center [&>svg]:size-full"
        >
          {icon}
        </span>
      )}
      {children}
    </Link>
  )
}
