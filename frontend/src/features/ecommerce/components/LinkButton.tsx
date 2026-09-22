import type { MouseEventHandler, ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/shared/utils/cn'

export type LinkButtonVariant = 'primary' | 'secondary'

interface LinkButtonProps {
  to: string
  variant?: LinkButtonVariant
  icon?: ReactNode
  onClick?: MouseEventHandler<HTMLAnchorElement>
  className?: string
  children: ReactNode
}

/**
 * Enlace con la apariencia de un `Button` md del design system. Existe porque
 * un `<button>` dentro de un `<a>` no es HTML válido y `Button` no puede
 * renderizarse como enlace.
 *
 * `variant`: `primary` (bordó, el default de siempre) o `secondary` (dorado
 * sobre fondo oscuro, para los CTA del sitio público). Los hover mezclan el
 * color con un token del theme, igual que en `Button`.
 */
export function LinkButton({
  to,
  variant = 'primary',
  icon,
  onClick,
  className,
  children,
}: LinkButtonProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(CLASES_BASE, CLASES_VARIANTE[variant], className)}
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

const CLASES_BASE = [
  'inline-flex h-11 items-center justify-center gap-2 rounded-md px-4',
  'text-sm font-medium whitespace-nowrap transition-colors',
  'focus-visible:outline-2 focus-visible:outline-offset-2',
].join(' ')

// El outline del foco cambia con la variante: `content` es oscuro y se pierde
// sobre el fondo oscuro donde vive la variante dorada.
const CLASES_VARIANTE: Record<LinkButtonVariant, string> = {
  primary:
    'bg-primary text-primary-content hover:bg-[color-mix(in_srgb,var(--color-primary)_85%,var(--color-light))] focus-visible:outline-content',
  secondary:
    'bg-secondary text-dark hover:bg-[color-mix(in_srgb,var(--color-secondary)_85%,var(--color-light))] focus-visible:outline-light',
}
