import { useId } from 'react'
import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { Field } from '@/shared/components/ui/Field'
import {
  CLASES_CONTROL_BASE,
  CLASES_CONTROL_BORDE,
  CLASES_CONTROL_TAMANIO,
  type FieldSize,
} from '@/shared/components/ui/fieldStyles'
import { cn } from '@/shared/utils/cn'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[]
  label?: string
  required?: boolean
  helperText?: string
  error?: string
  size?: FieldSize
  // El `<select>` nativo no tiene `placeholder`: acá se resuelve como una
  // primera `<option>` deshabilitada, así que hay que declararlo a mano.
  placeholder?: string
}

/**
 * Desplegable del design system. Visualmente idéntico al `Input`: mismo alto,
 * mismo borde, mismo radio y mismos estados.
 *
 * Sirve en los dos contextos sin cambiar de componente:
 * - Como filtro de un listado: sin `label`, `size='sm'`, y el `placeholder`
 *   haciendo de etiqueta ("Marca", "Categoría", "Estado").
 * - Como campo de formulario en un modal: con `label` arriba, asterisco si es
 *   requerido y `size='md'`.
 *
 * Props:
 * - `options`: las opciones, como `{ value, label }[]`.
 * - `placeholder`: opción inicial no seleccionable. Mientras esté elegida, el
 *   texto se ve atenuado, igual que el placeholder de un input.
 * - `label`, `required`, `helperText`, `error`, `size`, `disabled`: se comportan
 *   exactamente igual que en `Input`.
 * - `id`: si no se pasa, se genera uno para poder asociar el label.
 * - `value`, `onChange`, `name`: atributos nativos.
 * - `className`: clases extra para el contenedor del campo.
 * - `...rest`: cualquier otro atributo nativo de `<select>`.
 */
export function Select({
  options,
  label,
  required = false,
  helperText,
  error,
  size = 'md',
  placeholder,
  value,
  defaultValue,
  id,
  className,
  ...rest
}: SelectProps) {
  const idGenerado = useId()
  const idControl = id ?? idGenerado
  const idMensaje = `${idControl}-mensaje`

  const tieneError = Boolean(error)
  const mensaje = error ?? helperText
  const tamanio = CLASES_CONTROL_TAMANIO[size]

  // Si el select no está controlado, el navegador saltea la opción deshabilitada
  // y elige la primera real: sin este `defaultValue` el placeholder no se vería.
  const esControlado = value !== undefined
  const propsDeValor = esControlado
    ? { value }
    : { defaultValue: defaultValue ?? (placeholder ? '' : undefined) }

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
      <div className="relative">
        <select
          id={idControl}
          required={required}
          {...propsDeValor}
          aria-invalid={tieneError || undefined}
          aria-describedby={mensaje ? idMensaje : undefined}
          className={cn(
            CLASES_CONTROL_BASE,
            CLASES_CONTROL_BORDE[tieneError ? 'error' : 'normal'],
            tamanio.texto,
            tamanio.alto,
            tamanio.paddingConIconoDer,
            'cursor-pointer appearance-none',
            // Mientras siga elegida la opción del placeholder (la única
            // deshabilitada) el texto se ve atenuado, como en un input.
            '[&:has(option:disabled:checked)]:text-content-muted'
          )}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} className="text-content">
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          aria-hidden="true"
          className={cn(
            'text-content-muted pointer-events-none absolute top-1/2 -translate-y-1/2',
            tamanio.icono,
            tamanio.posIconoDer
          )}
        />
      </div>
    </Field>
  )
}
