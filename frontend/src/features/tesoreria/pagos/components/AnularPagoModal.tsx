import { useEffect, useState } from 'react'
import { Ban, X } from 'lucide-react'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'

interface AnularPagoModalProps {
  open: boolean
  /** El código del pago a anular, para el título (ej. "PAGO-14"). */
  codigo: string
  onCancel: () => void
  onConfirm: (motivo: string) => void
  loading?: boolean
  error?: ApiErrorResponse | null
}

/**
 * Modal de anulación de un pago CONFIRMADA: pide el motivo (obligatorio) y
 * una confirmación explícita. Mismo patrón que `AnularComprobanteModal`: el
 * `ConfirmDialog` compartido no tiene campo de texto, así que la anulación
 * usa su propio modal.
 */
export function AnularPagoModal({
  open,
  codigo,
  onCancel,
  onConfirm,
  loading = false,
  error = null,
}: AnularPagoModalProps) {
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    if (open) setMotivo('')
  }, [open])

  const motivoValido = motivo.trim().length > 0

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={`Anular pago ${codigo}`}
      icon={<Ban />}
      size="sm"
      closeOnEscape={!loading}
      closeOnOverlayClick={!loading}
      footer={
        <>
          <Button variant="error" icon={<X />} onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="success"
            icon={<Ban />}
            onClick={() => onConfirm(motivo.trim())}
            loading={loading}
            disabled={!motivoValido || loading}
          >
            Anular pago
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-content-muted text-xs">
          Restituye el saldo pendiente de cada comprobante que este pago había descontado, y los
          devuelve a estado Pendiente. Esta acción no se puede deshacer.
        </p>

        <Input
          label="Motivo de la anulación"
          required
          multiline
          rows={3}
          placeholder="Ej. se cargó el pago por error, monto duplicado"
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
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
