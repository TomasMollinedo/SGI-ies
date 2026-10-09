import { useId, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { Paperclip } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Field } from '@/shared/components/ui/Field'
import { cn } from '@/shared/utils/cn'
import { COMPROBANTE } from '../config/misCompras.config'
import { ACCEPT_COMPROBANTE, formatearTamanioArchivo } from '../utils/comprobante'

interface CampoComprobanteProps {
  value: File | null
  onChange: (archivo: File | null) => void
  error?: string
  disabled?: boolean
}

/**
 * Campo para adjuntar el comprobante de una declaración de pago (T147). Es
 * controlado, pensado para ir dentro de un `Controller` de react-hook-form:
 * no valida nada, solo informa el archivo elegido.
 *
 * El `<input type="file">` va oculto y lo dispara el botón, que es el control
 * con foco: a él apuntan el label, `aria-invalid` y `aria-describedby`.
 */
export function CampoComprobante({
  value,
  onChange,
  error,
  disabled = false,
}: CampoComprobanteProps) {
  const idBoton = useId()
  const idMensaje = `${idBoton}-mensaje`
  const inputRef = useRef<HTMLInputElement>(null)
  const tieneError = Boolean(error)

  function manejarSeleccion(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0]
    // Se limpia el input para que elegir de nuevo el mismo archivo (ej.
    // después de quitarlo) vuelva a disparar el cambio.
    evento.target.value = ''
    if (archivo) onChange(archivo)
  }

  return (
    <Field
      idControl={idBoton}
      idMensaje={idMensaje}
      label={COMPROBANTE.label}
      required
      mensaje={error ?? COMPROBANTE.ayuda}
      tieneError={tieneError}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_COMPROBANTE}
        hidden
        disabled={disabled}
        onChange={manejarSeleccion}
      />

      <div
        className={cn(
          'bg-field flex flex-col gap-3 rounded-md border px-4 py-3 sm:flex-row sm:items-center',
          tieneError ? 'border-error' : 'border-subtle'
        )}
      >
        <Button
          id={idBoton}
          size="sm"
          icon={<Paperclip />}
          disabled={disabled}
          aria-invalid={tieneError || undefined}
          aria-describedby={idMensaje}
          onClick={() => inputRef.current?.click()}
          className="shrink-0"
        >
          {value ? COMPROBANTE.cambiar : COMPROBANTE.elegir}
        </Button>

        {value ? (
          <>
            <p className="text-content min-w-0 flex-1 text-xs">
              <span className="break-all">{value.name}</span>{' '}
              <span className="text-content-muted whitespace-nowrap">
                · {formatearTamanioArchivo(value.size)}
              </span>
            </p>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(null)}
              className="text-error focus-visible:outline-content w-fit shrink-0 cursor-pointer rounded text-xs font-medium underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {COMPROBANTE.quitar}
              <span className="sr-only"> {value.name}</span>
            </button>
          </>
        ) : (
          <p className="text-content-muted text-xs">{COMPROBANTE.sinArchivo}</p>
        )}
      </div>
    </Field>
  )
}
