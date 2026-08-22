import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Spinner } from '@/shared/components/ui/Spinner'
import { cn } from '@/shared/utils/cn'

export type ButtonVariant = 'primary' | 'success' | 'error' | 'warning'
export type ButtonSize = 'sm' | 'md'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  type?: 'button' | 'submit'
  children?: ReactNode
}

/**
 * Botón del design system. Componente puramente presentacional: no decide
 * qué acción ejecuta, qué ícono corresponde a cada variante ni cuándo está
 * cargando; todo eso lo define quien lo usa.
 *
 * Props:
 * - `variant`: color semántico tomado del theme. `'primary'` (bordó, texto claro),
 *   `'success'` (verde), `'error'` (rojo) o `'warning'` (amarillo, con texto
 *   oscuro por contraste). Default: `'primary'`.
 * - `size`: `'md'` (default) tiene la misma altura que un input/select estándar,
 *   para poder alinearlos en una barra de filtros. `'sm'` es la versión compacta
 *   para toolbars, filtros y paginación. No existe `'lg'`.
 * - `icon`: nodo opcional que se renderiza a la izquierda del texto, con un gap
 *   chico. Se marca como decorativo (`aria-hidden`), así que el significado
 *   siempre tiene que estar en el texto.
 * - `loading`: muestra un spinner, bloquea el click y mantiene el mismo ancho que
 *   en estado normal para que no salte el layout. Si hay `icon`, el spinner ocupa
 *   su lugar; si no lo hay, se superpone sobre el contenido reservando su ancho.
 * - `disabled`: baja la opacidad, pone `cursor-not-allowed` y desactiva el hover.
 * - `fullWidth`: ocupa el 100% del ancho del contenedor.
 * - `type`: `'button'` (default) o `'submit'`.
 * - `onClick`: handler de click (llega por `...rest`; el navegador no lo dispara
 *   mientras el botón está deshabilitado o cargando).
 * - `children`: el texto del botón.
 * - `className`: clases extra; pisan a las internas gracias a `cn`.
 * - `...rest`: cualquier otro atributo nativo de `<button>` (`title`, `aria-*`,
 *   `form`, etc.).
 */
export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  const estaBloqueado = disabled || loading
  const tieneIcono = icon !== undefined && icon !== null
  // Sin ícono no hay lugar donde meter el spinner sin ensanchar el botón:
  // se superpone al contenido, que queda invisible pero sigue midiendo.
  const spinnerSuperpuesto = loading && !tieneIcono

  return (
    <button
      type={type}
      disabled={estaBloqueado}
      aria-busy={loading || undefined}
      className={cn(
        CLASES_BASE,
        CLASES_VARIANTE[variant],
        CLASES_TAMANIO[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      <span
        className={cn(
          'col-start-1 row-start-1 inline-flex items-center',
          CLASES_GAP[size],
          spinnerSuperpuesto && 'invisible'
        )}
      >
        {loading && tieneIcono ? (
          <Spinner className={CLASES_ICONO[size]} />
        ) : tieneIcono ? (
          <span
            aria-hidden="true"
            className={cn('inline-flex shrink-0 items-center justify-center', CLASES_ICONO[size])}
          >
            {icon}
          </span>
        ) : null}
        {children}
      </span>

      {spinnerSuperpuesto && (
        <span className="col-start-1 row-start-1 inline-flex items-center justify-center">
          <Spinner className={CLASES_ICONO[size]} />
        </span>
      )}
    </button>
  )
}

const CLASES_BASE = [
  'inline-grid place-items-center rounded-md font-medium whitespace-nowrap',
  'cursor-pointer transition-colors',
  'focus-visible:outline-content focus-visible:outline-2 focus-visible:outline-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ')

// Los hover mezclan el color base con `--color-light` del theme: aclaran sin
// introducir colores nuevos. `enabled:` evita que el hover se aplique cuando el
// botón está deshabilitado o cargando.
const CLASES_VARIANTE: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-content enabled:hover:bg-[color-mix(in_srgb,var(--color-primary)_85%,var(--color-light))]',
  success:
    'bg-success text-primary-content enabled:hover:bg-[color-mix(in_srgb,var(--color-success)_85%,var(--color-light))]',
  error:
    'bg-error text-primary-content enabled:hover:bg-[color-mix(in_srgb,var(--color-error)_85%,var(--color-light))]',
  warning:
    'bg-warning text-content enabled:hover:bg-[color-mix(in_srgb,var(--color-warning)_85%,var(--color-light))]',
}

// `md` (h-11 / 44px) es la altura de control del sistema: los inputs y selects
// tienen que usar la misma para alinearse en las barras de filtros.
const CLASES_TAMANIO: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-11 px-4 text-sm',
}

const CLASES_GAP: Record<ButtonSize, string> = {
  sm: 'gap-1.5',
  md: 'gap-2',
}

const CLASES_ICONO: Record<ButtonSize, string> = {
  sm: 'size-4 [&>svg]:size-full',
  md: 'size-5 [&>svg]:size-full',
}
