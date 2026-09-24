import { useEffect, useState } from 'react'
import { Ban, X } from 'lucide-react'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'

interface AnularCobroModalProps {
  open: boolean
  /** El código del cobro a anular, para el título (ej. "COBRO-14"). */
  codigo: string
  onCancel: () => void
  onConfirm: (motivo: string) => void
  loading?: boolean
  error?: ApiErrorResponse | null
}

/**
 * Modal de anulación de un cobro CONFIRMADO: pide el motivo (obligatorio) y
 * una confirmación explícita. Copia de `AnularPagoModal`: el `ConfirmDialog`
 * compartido no tiene campo de texto.
 */
export function AnularCobroModal({
  open,
  codigo,
  onCancel,
  onConfirm,
  loading = false,
  error = null,
}: AnularCobroModalProps) {
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    if (open) setMotivo('')
  }, [open])

  const motivoValido = motivo.trim().length > 0

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={`Anular cobro ${codigo}`}
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
            Anular cobro
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-content-muted text-xs">
          Restituye a cada cuota imputada el saldo que este cobro le había descontado. Si la unidad
          había quedado Vendida, vuelve a En plan de pago. Esta acción no se puede deshacer.
        </p>

        <Input
          label="Motivo de la anulación"
          required
          multiline
          rows={3}
          maxLength={500}
          placeholder="Ej. se cargó el cobro por error, importe equivocado"
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
