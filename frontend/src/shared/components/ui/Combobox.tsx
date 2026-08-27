import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Search } from 'lucide-react'
import { Field } from '@/shared/components/ui/Field'
import {
  CLASES_CONTROL_BASE,
  CLASES_CONTROL_BORDE,
  CLASES_CONTROL_TAMANIO,
  type FieldSize,
} from '@/shared/components/ui/fieldStyles'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { cn } from '@/shared/utils/cn'

export interface ComboboxOption {
  value: string
  label: string
  description?: string
}

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  onSearch: (query: string) => void
  /** Texto a mostrar para `value` cuando viene seteado desde afuera (ej. al resetear un form de edición). No hace falta si el campo siempre arranca vacío. */
  selectedLabel?: string
  loading?: boolean
  /** Si `options` es solo una parte de los resultados totales (ej. el backend pagina y hay más). Muestra un aviso debajo de la lista para que el usuario acote la búsqueda. */
  hasMoreResults?: boolean
  /** Caracteres mínimos para disparar `onSearch`. Default: 1. */
  minChars?: number
  debounceMs?: number
  label?: string
  required?: boolean
  helperText?: string
  error?: string
  size?: FieldSize
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  name?: string
  className?: string
}

/**
 * Campo de búsqueda con resultados server-side: un input de texto que dispara
 * `onSearch` con debounce y muestra las `options` recibidas en un desplegable
 * clickeable. Reemplaza al `<Select>` nativo cuando el catálogo de opciones es
 * grande y vive en el backend (ej. elegir un artículo por nombre).
 *
 * Es controlado por `value`/`onChange` como cualquier campo de RHF (usar junto
 * a `Controller`, no `register`, porque no es un `<input>` nativo simple). Solo
 * conoce el `value` elegido (string); quien lo usa es responsable de buscar y
 * pasarle las `options` (típicamente desde un hook de React Query).
 *
 * Props:
 * - `value` / `onChange`: el `value` de la opción elegida, o `''` si no hay
 *   ninguna. `onChange` recibe ese string.
 * - `options`: los resultados a mostrar en el desplegable, ya filtrados por el
 *   backend según el último `onSearch`.
 * - `onSearch`: se llama con el texto tipeado (trimeado), debounced, mientras
 *   el desplegable está abierto. No se llama por debajo de `minChars`.
 * - `selectedLabel`: qué texto mostrar para `value` cuando el campo se llena
 *   desde afuera (no por selección del usuario). Si `value` siempre arranca
 *   vacío, no hace falta pasarlo.
 * - `loading`: mientras busca, el desplegable muestra "Buscando…" en vez de
 *   la lista.
 * - `hasMoreResults`: agrega un aviso al final de la lista pidiendo acotar
 *   la búsqueda, para cuando `options` es solo una página de resultados.
 * - `minChars`: default 1.
 * - `debounceMs`: default 300.
 * - `label`, `required`, `helperText`, `error`, `size`, `disabled`: igual que
 *   `Input`/`Select`.
 * - `placeholder`: placeholder del input de búsqueda.
 * - `emptyText`: mensaje cuando la búsqueda no encuentra nada. Default
 *   "No se encontraron resultados".
 * - `name`: para asociar el campo a un formulario / lector de pantalla.
 * - `className`: clases extra para el contenedor del campo.
 *
 * Navegación por teclado: flechas para moverse entre opciones, Enter para
 * elegir la resaltada, Escape para cerrar y volver al texto de la selección
 * vigente. Un click afuera del campo hace lo mismo que Escape.
 */
export function Combobox({
  value,
  onChange,
  options,
  onSearch,
  selectedLabel = '',
  loading = false,
  hasMoreResults = false,
  minChars = 2,
  debounceMs = 300,
  label,
  required = false,
  helperText,
  error,
  size = 'md',
  placeholder,
  emptyText = 'No se encontraron resultados',
  disabled = false,
  name,
  className,
}: ComboboxProps) {
  const idGenerado = useId()
  const idControl = `combobox-${idGenerado}`
  const idMensaje = `${idControl}-mensaje`
  const idLista = `${idControl}-lista`

  const [texto, setTexto] = useState(selectedLabel)
  const [abierto, setAbierto] = useState(false)
  const [indiceActivo, setIndiceActivo] = useState(-1)
  const contenedorRef = useRef<HTMLDivElement>(null)

  // El label del `value` vigente: a dónde volver si el usuario tipea para
  // buscar y después cancela (Escape, click afuera) sin llegar a elegir nada
  // nuevo. No es simplemente la prop `selectedLabel`: esa solo describe el
  // valor inicial/externo, y acá hay que reflejar también lo que el usuario
  // fue eligiendo internamente.
  const labelConfirmadoRef = useRef(selectedLabel)

  // Refs para leer la versión más reciente de `selectedLabel`/`onSearch` sin
  // que los efectos de abajo tengan que reaccionar a sus cambios de
  // identidad — solo les importa `value`/`textoBuscable`, respectivamente.
  const selectedLabelRef = useRef(selectedLabel)
  selectedLabelRef.current = selectedLabel
  const onSearchRef = useRef(onSearch)
  onSearchRef.current = onSearch

  // Distingue si el próximo cambio de `value` lo disparó una selección o un
  // borrado hechos acá adentro (donde `texto` ya quedó bien seteado) de uno
  // que vino de afuera (ej. `reset()` de un form), que sí necesita
  // resincronizar `texto` con `selectedLabel`.
  const cambioInternoRef = useRef(false)

  const textoDebounced = useDebounce(texto, debounceMs)
  const textoBuscable = textoDebounced.trim()

  useEffect(() => {
    if (cambioInternoRef.current) {
      cambioInternoRef.current = false
      return
    }
    labelConfirmadoRef.current = selectedLabelRef.current
    setTexto(selectedLabelRef.current)
  }, [value])

  // Dispara la búsqueda solo mientras el desplegable está abierto: evita
  // pedir de más cuando el texto se resincronizó desde afuera y nadie tipeó.
  useEffect(() => {
    if (!abierto || textoBuscable.length < minChars) return
    onSearchRef.current(textoBuscable)
  }, [textoBuscable, abierto, minChars])

  useEffect(() => {
    if (!abierto) return

    function manejarClickAfuera(evento: MouseEvent) {
      if (contenedorRef.current?.contains(evento.target as Node)) return
      setAbierto(false)
      setTexto(labelConfirmadoRef.current)
      setIndiceActivo(-1)
    }

    document.addEventListener('mousedown', manejarClickAfuera)
    return () => document.removeEventListener('mousedown', manejarClickAfuera)
  }, [abierto])

  function seleccionar(opcion: ComboboxOption) {
    cambioInternoRef.current = true
    labelConfirmadoRef.current = opcion.label
    onChange(opcion.value)
    setTexto(opcion.label)
    setAbierto(false)
    setIndiceActivo(-1)
  }

  function manejarCambioTexto(valorTexto: string) {
    setTexto(valorTexto)
    setAbierto(true)
    setIndiceActivo(-1)
    // Borrar el texto a mano es la forma de deshacer la selección.
    if (valorTexto === '' && value !== '') {
      cambioInternoRef.current = true
      labelConfirmadoRef.current = ''
      onChange('')
    }
  }

  function manejarKeyDown(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault()
      if (!abierto) {
        setAbierto(true)
        return
      }
      setIndiceActivo((indice) => Math.min(indice + 1, options.length - 1))
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault()
      setIndiceActivo((indice) => Math.max(indice - 1, 0))
    } else if (evento.key === 'Enter') {
      if (abierto && indiceActivo >= 0 && options[indiceActivo]) {
        evento.preventDefault()
        seleccionar(options[indiceActivo])
      }
    } else if (evento.key === 'Escape') {
      setAbierto(false)
      setTexto(labelConfirmadoRef.current)
      setIndiceActivo(-1)
    }
  }

  const tieneError = Boolean(error)
  const mensaje = error ?? helperText
  const tamanio = CLASES_CONTROL_TAMANIO[size]
  const mostrarLista = abierto && !disabled

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
      <div ref={contenedorRef} className="relative">
        <span
          aria-hidden="true"
          className={cn(
            'text-content-muted pointer-events-none absolute top-1/2 inline-flex -translate-y-1/2 items-center justify-center [&>svg]:size-full',
            tamanio.icono,
            tamanio.posIconoIzq
          )}
        >
          <Search />
        </span>

        <input
          id={idControl}
          name={name}
          role="combobox"
          aria-expanded={mostrarLista}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-invalid={tieneError || undefined}
          aria-describedby={mensaje ? idMensaje : undefined}
          autoComplete="off"
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          value={texto}
          onChange={(evento) => manejarCambioTexto(evento.target.value)}
          onFocus={() => setAbierto(true)}
          onKeyDown={manejarKeyDown}
          className={cn(
            CLASES_CONTROL_BASE,
            CLASES_CONTROL_BORDE[tieneError ? 'error' : 'normal'],
            tamanio.texto,
            tamanio.alto,
            tamanio.paddingConIconoIzq
          )}
        />

        {mostrarLista && (
          <ul
            id={idLista}
            role="listbox"
            className="bg-fondotabla border-subtle absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border py-1 shadow-lg"
          >
            {textoBuscable.length < minChars ? (
              <li className="text-content-muted px-3 py-2 text-xs">Escribí para buscar</li>
            ) : loading ? (
              <li className="text-content-muted flex items-center gap-2 px-3 py-2 text-xs">
                <Spinner className="size-3.5" />
                Buscando…
              </li>
            ) : options.length === 0 ? (
              <li className="text-content-muted px-3 py-2 text-xs">{emptyText}</li>
            ) : (
              options.map((opcion, indice) => (
                <li
                  key={opcion.value}
                  role="option"
                  aria-selected={opcion.value === value}
                  onMouseDown={(evento) => {
                    evento.preventDefault()
                    seleccionar(opcion)
                  }}
                  onMouseEnter={() => setIndiceActivo(indice)}
                  className={cn(
                    'cursor-pointer px-3 py-2 text-sm',
                    indice === indiceActivo && 'bg-secondary',
                    opcion.value === value && 'font-medium'
                  )}
                >
                  <div className="text-content">{opcion.label}</div>
                  {opcion.description && (
                    <div className="text-content-muted text-xs">{opcion.description}</div>
                  )}
                </li>
              ))
            )}

            {!loading && options.length > 0 && hasMoreResults && (
              <li className="text-content-muted border-subtle border-t px-3 py-2 text-xs">
                Hay más resultados. Seguí escribiendo para acotar la búsqueda.
              </li>
            )}
          </ul>
        )}
      </div>
    </Field>
  )
}
