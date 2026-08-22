export type FieldSize = 'sm' | 'md'

/**
 * Estilos del control en sí (el `<input>`, `<textarea>` o `<select>`).
 * Viven acá para que Input y Select compartan literalmente el mismo borde,
 * radio, foco y estados. Si cambiás algo, cambia en los dos a la vez.
 */
export const CLASES_CONTROL_BASE = [
  'bg-field text-content w-full rounded-md border transition-colors',
  'placeholder:text-content-muted',
  'focus:ring-2 focus:outline-none',
  'disabled:bg-surface-muted disabled:text-content-muted disabled:cursor-not-allowed',
  'read-only:bg-surface-muted read-only:text-content-muted',
].join(' ')

export const CLASES_CONTROL_BORDE = {
  normal: 'border-subtle focus:border-primary focus:ring-primary/35',
  error: 'border-error focus:border-error focus:ring-error/35',
}

/**
 * `md` (h-11 / 44px) y `sm` (h-9 / 36px) son exactamente las alturas del
 * `Button`. Es lo que permite alinear buscador + filtros + botón en una fila.
 */
export const CLASES_CONTROL_TAMANIO: Record<
  FieldSize,
  {
    alto: string
    texto: string
    padding: string
    paddingConIconoIzq: string
    paddingConIconoDer: string
    paddingTextarea: string
    icono: string
    posIconoIzq: string
    posIconoDer: string
  }
> = {
  sm: {
    alto: 'h-9',
    texto: 'text-xs',
    padding: 'px-3',
    paddingConIconoIzq: 'pr-3 pl-9',
    paddingConIconoDer: 'pr-9 pl-3',
    paddingTextarea: 'px-3 py-2',
    icono: 'size-4',
    posIconoIzq: 'left-3',
    posIconoDer: 'right-3',
  },
  md: {
    alto: 'h-11',
    texto: 'text-sm',
    padding: 'px-4',
    paddingConIconoIzq: 'pr-4 pl-11',
    paddingConIconoDer: 'pr-11 pl-4',
    paddingTextarea: 'px-4 py-2.5',
    icono: 'size-5',
    posIconoIzq: 'left-4',
    posIconoDer: 'right-4',
  },
}
