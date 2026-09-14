import { useEffect, useState } from 'react'
import { Ban, Check, X } from 'lucide-react'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { ESTADO_META } from '../config/ordenCompra.config'
import type { EstadoOrdenCompra } from '../types/ordenCompra.types'

interface AvanzarEstadoOrdenCompraModalProps {
  /** El estado al que se quiere avanzar. Con `null` el modal está cerrado. */
  estadoDestino: EstadoOrdenCompra | null
  /** Código de la orden (ej. "OC-3"), para el título. */
  numero: string
  onCancel: () => void
  onConfirm: (observacion: string) => void
  loading?: boolean
  error?: ApiErrorResponse | null
}

/**
 * Confirma un único avance de estado puntual (no elige la transición: quien
 * abre este modal ya decidió a qué estado va, con el botón que tocó). Pide
 * una observación del cambio — obligatoria solo cuando el destino es
 * CANCELADA, donde además pasa a llamarse "motivo de cancelación", igual que
 * exige el backend.
 *
 * El `ConfirmDialog` compartido no tiene campo de texto, así que este avance
 * —que necesita esa observación— usa su propio modal, igual que
 * `AnularComprobanteModal` en Comprobantes.
 */
export function AvanzarEstadoOrdenCompraModal({
  estadoDestino,
  numero,
  onCancel,
  onConfirm,
  loading = false,
  error = null,
}: AvanzarEstadoOrdenCompraModalProps) {
  const [observacion, setObservacion] = useState('')

  useEffect(() => {
    if (estadoDestino !== null) setObservacion('')
  }, [estadoDestino])

  if (estadoDestino === null) return null

  const esCancelacion = estadoDestino === 'CANCELADA'
  const etiquetaDestino = ESTADO_META[estadoDestino].label
  const observacionValida = !esCancelacion || observacion.trim().length > 0

  return (
    <Modal
      open
      onClose={onCancel}
      title={`${numero} · Marcar como ${etiquetaDestino}`}
      icon={esCancelacion ? <Ban /> : <Check />}
      size="sm"
      closeOnEscape={!loading}
      closeOnOverlayClick={!loading}
      footer={
        <>
          <Button variant="error" icon={<X />} onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant={esCancelacion ? 'error' : 'success'}
            icon={esCancelacion ? <Ban /> : <Check />}
            onClick={() => onConfirm(observacion.trim())}
            loading={loading}
            disabled={!observacionValida || loading}
          >
            {esCancelacion ? 'Cancelar orden' : `Marcar como ${etiquetaDestino}`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-content-muted text-xs">
          {esCancelacion
            ? 'Una orden cancelada es un estado final: no se puede volver a activar ni avanzar a otro estado.'
            : `¿Confirmás que querés marcar la orden ${numero} como ${etiquetaDestino.toLowerCase()}?`}
        </p>

        <Input
          label={esCancelacion ? 'Motivo de cancelación' : 'Observación del cambio'}
          required={esCancelacion}
          multiline
          rows={3}
          placeholder={esCancelacion ? 'Ej. el proveedor no puede cumplir la entrega' : 'Opcional'}
          value={observacion}
          onChange={(evento) => setObservacion(evento.target.value)}
          disabled={loading}
        />

        {error && (
          <p
            role="alert"
            className="border-error/30 bg-error/10 text-error rounded-md border px-4 py-3 text-xs"
          >
            {formatearMensajeError(error.message)}
          </p>
        )}
      </div>
    </Modal>
  )
}
