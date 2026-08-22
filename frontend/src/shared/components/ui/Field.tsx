import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

interface FieldProps {
  idControl: string
  idMensaje: string
  label?: string
  required?: boolean
  mensaje?: string
  tieneError?: boolean
  className?: string
  children: ReactNode
}

/**
 * Envoltorio interno que comparten `Input` y `Select`: label arriba, control en
 * el medio, mensaje de ayuda o de error abajo. No se usa directamente desde las
 * pantallas — existe para que los dos campos se vean y se comporten igual.
 *
 * Props:
 * - `idControl`: id del input/select, para asociar el `<label>` con `htmlFor`.
 * - `idMensaje`: id del párrafo de ayuda/error, para el `aria-describedby` del
 *   control.
 * - `label`: si no viene, no se renderiza el `<label>` (caso filtro).
 * - `required`: agrega el asterisco al lado del label.
 * - `mensaje`: el texto de abajo, ya resuelto por el componente que lo usa
 *   (el error tiene prioridad sobre el helperText).
 * - `tieneError`: pinta el mensaje con el color de error y le pone `role="alert"`.
 * - `className`: clases extra para el contenedor.
 */
export function Field({
  idControl,
  idMensaje,
  label,
  required = false,
  mensaje,
  tieneError = false,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={idControl} className="text-content text-xs font-medium">
          {label}
          {required && (
            <span aria-hidden="true" className="text-error">
              {' *'}
            </span>
          )}
        </label>
      )}

      {children}

      {mensaje && (
        <p
          id={idMensaje}
          role={tieneError ? 'alert' : undefined}
          className={cn('text-xs', tieneError ? 'text-error' : 'text-content-muted')}
        >
          {mensaje}
        </p>
      )}
    </div>
  )
}
