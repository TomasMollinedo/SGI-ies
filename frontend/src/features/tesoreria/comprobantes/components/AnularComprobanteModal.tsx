import { useEffect, useState } from 'react'
import { Ban, X } from 'lucide-react'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'

interface AnularComprobanteModalProps {
  open: boolean
  /** El número del comprobante a anular, para el título (ej. "A 0003-00000055"). */
  numero: string
  onCancel: () => void
  onConfirm: (motivo: string) => void
  loading?: boolean
  error?: ApiErrorResponse | null
}

/**
 * Modal de anulación de un comprobante REGISTRADO: pide el motivo (obligatorio)
 * y una confirmación explícita. El `ConfirmDialog` compartido no tiene un campo
 * de texto, así que la anulación —que necesita el motivo— usa su propio modal.
 * Si la operación falla, el error se muestra acá adentro y el modal queda abierto.
 */
export function AnularComprobanteModal({
  open,
  numero,
  onCancel,
  onConfirm,
  loading = false,
  error = null,
}: AnularComprobanteModalProps) {
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    if (open) setMotivo('')
  }, [open])

  const motivoValido = motivo.trim().length > 0

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={`Anular comprobante ${numero}`}
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
            Anular comprobante
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-content-muted text-xs">
          Un comprobante anulado deja de considerarse en la cuenta corriente del proveedor y no se
          puede volver a usar. Solo se puede anular si no tiene ningún pago imputado.
        </p>

        <Input
          label="Motivo de la anulación"
          required
          multiline
          rows={3}
          placeholder="Ej. cargado con el número equivocado"
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