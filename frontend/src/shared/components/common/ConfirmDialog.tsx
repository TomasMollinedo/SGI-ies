import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { useDialogBehavior } from '@/shared/hooks/useDialogBehavior'
import { cn } from '@/shared/utils/cn'

export type ConfirmDialogVariant = 'baja' | 'reactivar'

export interface ConfirmDialogDetail {
  label: string
  value: string
}

interface ConfirmDialogProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  eyebrow: string
  eyebrowIcon?: ReactNode
  title: string
  details?: ConfirmDialogDetail[]
  note?: string
  variant?: ConfirmDialogVariant
  confirmLabel?: string
  confirmIcon?: ReactNode
  cancelLabel?: string
  loading?: boolean
  error?: string | null
  hideConfirm?: boolean
}

/**
 * Diálogo de confirmación para acciones sensibles: dar de baja y reactivar.
 * Es una tarjeta blanca angosta, sin el header oscuro del `Modal`.
 *
 * Props:
 * - `open`: mientras es `false` no se renderiza nada.
 * - `onCancel`: se llama al tocar Cancelar, al apretar Escape y al clickear el
 *   overlay. Con `loading` en `true`, Escape y overlay quedan desactivados.
 * - `onConfirm`: se llama al tocar Confirmar.
 * - `eyebrow`: la línea chica en mayúsculas de arriba (ej. "CONFIRMAR BAJA
 *   LÓGICA").
 * - `eyebrowIcon`: ícono opcional al lado del eyebrow. Hereda su color.
 * - `title`: la pregunta. Se usa como `aria-labelledby` del diálogo.
 * - `details`: lista con viñetas de los datos del registro afectado.
 * - `note`: párrafo chico y gris debajo de la lista.
 * - `variant`: solo define el color del eyebrow. `'baja'` (error, default) o
 *   `'reactivar'`.
 * - `confirmLabel` / `cancelLabel`: default "Confirmar" y "Cancelar".
 * - `confirmIcon`: ícono del botón de confirmar. Default: un tilde.
 * - `loading`: deshabilita los dos botones y muestra el spinner en Confirmar.
 * - `error`: si la operación falló, el mensaje se muestra adentro del diálogo
 *   —que queda abierto— en vez de cerrarlo. El botón de confirmar hace las
 *   veces de "reintentar".
 * - `hideConfirm`: saca el botón de confirmar y deja solo el de cancelar. Para
 *   errores que reintentar no arregla (ej. una baja bloqueada por reglas de
 *   negocio): ahí lo único que queda es cerrar.
 *
 * Al abrir, el foco va al botón de **Cancelar**: es la acción segura, y así un
 * Enter accidental no dispara la operación sensible. Eso funciona porque
 * Cancelar es el primer elemento enfocable de la tarjeta — si algún día se
 * agrega un control antes, hay que revisarlo.
 */
export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  eyebrow,
  eyebrowIcon,
  title,
  details,
  note,
  variant = 'baja',
  confirmLabel = 'Confirmar',
  confirmIcon,
  cancelLabel = 'Cancelar',
  loading = false,
  error = null,
  hideConfirm = false,
}: ConfirmDialogProps) {
  const idTitulo = useId()
  const accionesRef = useRef<HTMLDivElement>(null)
  const { tarjetaRef, manejarMouseDownOverlay } = useDialogBehavior({
    open,
    onClose: onCancel,
    // Con una operación en curso no se puede abandonar a mitad de camino.
    closeOnEscape: !loading,
    closeOnOverlayClick: !loading,
  })

  // Al fallar, el foco estaba en Confirmar, que puede haber desaparecido: se lo
  // devuelve a Cancelar, el primer botón de la fila de acciones.
  useEffect(() => {
    if (!error) return

    accionesRef.current?.querySelector('button')?.focus()
  }, [error])

  if (!open) return null

  return createPortal(
    <div
      onMouseDown={manejarMouseDownOverlay}
      className="bg-dark/50 fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        ref={tarjetaRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="bg-fondotabla flex w-full max-w-[420px] flex-col gap-4 rounded-lg p-6 shadow-xl outline-none"
      >
        <p
          className={cn(
            'flex items-center gap-2 text-xs font-semibold uppercase',
            CLASES_VARIANTE[variant]
          )}
        >
          {eyebrowIcon && (
            <span
              aria-hidden="true"
              className="inline-flex size-4 shrink-0 items-center justify-center [&>svg]:size-full"
            >
              {eyebrowIcon}
            </span>
          )}
          {eyebrow}
        </p>

        <h2 id={idTitulo} className="text-content text-subtitulo font-semibold">
          {title}
        </h2>

        {details && details.length > 0 && (
          <ul className="text-content-muted flex list-disc flex-col gap-1 pl-5 text-xs">
            {details.map((detalle) => (
              <li key={detalle.label}>
                <span className="text-content">{detalle.label}:</span> {detalle.value}
              </li>
            ))}
          </ul>
        )}

        {note && <p className="text-content-muted text-xs">{note}</p>}

        {error && (
          <p
            role="alert"
            className="border-error/30 bg-error/10 text-error rounded-md border px-4 py-3 text-xs"
          >
            {error}
          </p>
        )}

        <div ref={accionesRef} className="flex items-center justify-end gap-3 pt-2">
          <Button variant="error" icon={<X />} disabled={loading} onClick={onCancel}>
            {cancelLabel}
          </Button>
          {!hideConfirm && (
            <Button
              variant="success"
              icon={confirmIcon ?? <Check />}
              loading={loading}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// La variante solo cambia el color del eyebrow; el resto de la tarjeta es igual.
const CLASES_VARIANTE: Record<ConfirmDialogVariant, string> = {
  baja: 'text-error',
  reactivar: 'text-reactivar',
}
