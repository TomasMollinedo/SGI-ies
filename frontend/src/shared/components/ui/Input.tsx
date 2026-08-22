import { useId } from 'react'
import type {
  ChangeEventHandler,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react'
import { Field } from '@/shared/components/ui/Field'
import {
  CLASES_CONTROL_BASE,
  CLASES_CONTROL_BORDE,
  CLASES_CONTROL_TAMANIO,
  type FieldSize,
} from '@/shared/components/ui/fieldStyles'
import { cn } from '@/shared/utils/cn'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'> {
  label?: string
  required?: boolean
  helperText?: string
  error?: string
  iconLeft?: ReactNode
  multiline?: boolean
  rows?: number
  size?: FieldSize
  onChange?: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>
}

/**
 * Campo de texto del design system. Con `multiline` renderiza un `<textarea>`
 * en vez de un `<input>`, manteniendo el mismo borde, radio y estados.
 *
 * Props:
 * - `label`: si viene, se renderiza arriba del campo y queda asociado al control
 *   por `htmlFor`/`id`.
 * - `required`: muestra un asterisco junto al label y marca el control como
 *   requerido para el navegador y los lectores de pantalla.
 * - `helperText`: texto chico y atenuado debajo del campo.
 * - `error`: si viene, reemplaza al `helperText`, pinta el borde con el color de
 *   error del theme y anuncia el mensaje con `role="alert"`.
 * - `iconLeft`: ícono dentro del campo, a la izquierda (la lupa del buscador).
 *   Es decorativo y no recibe clicks: el click cae en el input.
 * - `multiline`: renderiza un `<textarea>`. En ese caso la altura la define
 *   `rows` y no el `size`.
 * - `rows`: cantidad de filas del textarea. Default: 4.
 * - `size`: `'md'` (44px, default) o `'sm'` (36px). Coinciden exactamente con
 *   las alturas del `Button`, para alinearlos en una barra de filtros.
 * - `disabled` / `readOnly`: fondo gris suave y texto atenuado. `readOnly` es el
 *   indicado para los campos que completa el sistema (ej. un código "ART-0117"),
 *   porque el valor se sigue enviando en el submit.
 * - `id`: si no se pasa, se genera uno para poder asociar el label.
 * - `placeholder`, `value`, `onChange`, `name`, `type`: atributos nativos.
 * - `className`: clases extra para el contenedor del campo.
 * - `...rest`: cualquier otro atributo nativo (`maxLength`, `autoComplete`, etc.).
 */
export function Input({
  label,
  required = false,
  helperText,
  error,
  iconLeft,
  multiline = false,
  rows = 4,
  size = 'md',
  type = 'text',
  id,
  className,
  ...rest
}: InputProps) {
  const idGenerado = useId()
  const idControl = id ?? idGenerado
  const idMensaje = `${idControl}-mensaje`

  const tieneError = Boolean(error)
  const mensaje = error ?? helperText
  const tamanio = CLASES_CONTROL_TAMANIO[size]

  const propsAccesibilidad = {
    id: idControl,
    required,
    'aria-invalid': tieneError || undefined,
    'aria-describedby': mensaje ? idMensaje : undefined,
  }

  const clasesControl = cn(
    CLASES_CONTROL_BASE,
    CLASES_CONTROL_BORDE[tieneError ? 'error' : 'normal'],
    tamanio.texto
  )

  return (
    <Field
      idControl={idControl}
      idMensaje={idMensaje}
      label={label}
      required={required}
      mensaje={mensaje}
      tieneError={tieneError}
      className={className}
    >
      {multiline ? (
        <textarea
          rows={rows}
          {...propsAccesibilidad}
          className={cn(clasesControl, tamanio.paddingTextarea, 'resize-y')}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <div className="relative">
          {iconLeft && (
            <span
              aria-hidden="true"
              className={cn(
                'text-content-muted pointer-events-none absolute top-1/2 inline-flex -translate-y-1/2 items-center justify-center [&>svg]:size-full',
                tamanio.icono,
                tamanio.posIconoIzq
              )}
            >
              {iconLeft}
            </span>
          )}
          <input
            type={type}
            {...propsAccesibilidad}
            className={cn(
              clasesControl,
              tamanio.alto,
              iconLeft ? tamanio.paddingConIconoIzq : tamanio.padding
            )}
            {...rest}
          />
        </div>
      )}
    </Field>
  )
}
