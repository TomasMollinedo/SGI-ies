import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { Spinner } from '@/shared/components/Spinner'
import type { ColorToken } from '@/shared/types/theme.types'
import { cn } from '@/shared/utils/cn'

export type IconButtonVariant = 'ghost' | 'soft'
export type IconButtonSize = 'sm' | 'md'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  icon: ReactNode
  ariaLabel: string
  bgColor?: ColorToken
  iconColor?: ColorToken
  variant?: IconButtonVariant
  size?: IconButtonSize
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
}

/**
 * Botón que contiene solo un ícono, sin texto visible.
 *
 * Es deliberadamente genérico: no conoce ningún ícono ni color propio, todo
 * entra por props. Por eso sirve igual para las acciones de tabla (ver
 * `RowActions`), la X de cerrar de un modal o los controles de paginación.
 *
 * Props:
 * - `icon`: el ícono a renderizar. Obligatorio. Se marca como decorativo
 *   (`aria-hidden`); el significado lo aporta `ariaLabel`.
 * - `ariaLabel`: obligatorio. Como no hay texto visible, es lo único que un
 *   lector de pantalla puede anunciar.
 * - `bgColor`: token de color del theme para el fondo. Solo tiene efecto con
 *   `variant='soft'`.
 * - `iconColor`: token de color del theme para el ícono. Si no se pasa, hereda
 *   el color de texto del contenedor.
 * - `variant`: `'ghost'` (sin fondo, default) o `'soft'` (fondo de color).
 * - `size`: `'sm'` (caja de 40px, ícono de 16px) o `'md'` (caja de 44px, ícono
 *   de 20px, misma altura que un `Button` md). Default: `'md'`.
 * - `loading`: reemplaza el ícono por un spinner y bloquea el click. Como el
 *   botón es cuadrado y de tamaño fijo, el layout nunca salta.
 * - `disabled`: baja la opacidad, pone `cursor-not-allowed` y desactiva el hover.
 * - `type`: `'button'` (default) o `'submit'`.
 * - `onClick`: handler de click (llega por `...rest`).
 * - `className`: clases extra; pisan a las internas gracias a `cn`.
 * - `...rest`: cualquier otro atributo nativo de `<button>` (`title`, `form`, etc.).
 */
export function IconButton({
  icon,
  ariaLabel,
  bgColor,
  iconColor,
  variant = 'ghost',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  className,
  style,
  ...rest
}: IconButtonProps) {
  const estaBloqueado = disabled || loading

  // Los colores viajan como custom properties en vez de clases porque Tailwind
  // no puede generar clases armadas en runtime (`bg-${token}` no existiría).
  // Además, así el hover puede oscurecer el fondo con un `color-mix` estático.
  const variablesDeColor = {
    ...(bgColor && { '--icon-btn-bg': `var(--color-${bgColor})` }),
    ...(iconColor && { '--icon-btn-fg': `var(--color-${iconColor})` }),
    ...style,
  } as CSSProperties

  return (
    <button
      type={type}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      disabled={estaBloqueado}
      style={variablesDeColor}
      className={cn(CLASES_BASE, CLASES_VARIANTE[variant], CLASES_TAMANIO[size].caja, className)}
      {...rest}
    >
      {loading ? (
        <Spinner className={CLASES_TAMANIO[size].icono} />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex items-center justify-center [&>svg]:size-full',
            CLASES_TAMANIO[size].icono
          )}
        >
          {icon}
        </span>
      )}
    </button>
  )
}

const CLASES_BASE = [
  'inline-flex shrink-0 items-center justify-center rounded-md',
  'cursor-pointer transition-colors',
  'text-[var(--icon-btn-fg,currentColor)]',
  'focus-visible:outline-content focus-visible:outline-2 focus-visible:outline-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ')

// `enabled:` evita que el hover se aplique cuando el botón está deshabilitado o
// cargando. El oscurecido sale de `--color-dark` del theme, no de un hex nuevo.
const CLASES_VARIANTE: Record<IconButtonVariant, string> = {
  // Sin fondo propio: el hover oscurece apenas lo que haya detrás.
  ghost: 'bg-transparent enabled:hover:bg-[color-mix(in_srgb,var(--color-dark)_8%,transparent)]',
  soft: [
    'bg-[var(--icon-btn-bg,transparent)]',
    'enabled:hover:bg-[color-mix(in_srgb,var(--icon-btn-bg,transparent)_88%,var(--color-dark))]',
  ].join(' '),
}

// La caja nunca baja de 40px, aunque el ícono sea de 16px: es el mínimo de área
// clickeable. `md` coincide con la altura del `Button` md para alinearlos.
const CLASES_TAMANIO: Record<IconButtonSize, { caja: string; icono: string }> = {
  sm: { caja: 'size-10', icono: 'size-4' },
  md: { caja: 'size-11', icono: 'size-5' },
}
