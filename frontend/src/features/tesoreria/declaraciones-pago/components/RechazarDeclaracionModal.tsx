import { useEffect, useState } from 'react'
import { Ban, X } from 'lucide-react'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { MAX_MOTIVO_RECHAZO } from '../config/declaracionPago.config'
import type { DeclaracionPago } from '../types/declaracionPago.types'
import { DatosDeclaracion } from './DatosDeclaracion'

interface RechazarDeclaracionModalProps {
  /** La declaración a rechazar. En `null` el modal está cerrado. */
  declaracion: DeclaracionPago | null
  onCancel: () => void
  onConfirm: (motivo: string) => void
  loading?: boolean
  error?: string | null
}

/**
 * Rechazo de una declaración PENDIENTE (T117, HU-29): pide el motivo
 * (obligatorio, de 1 a 500 caracteres), que el cliente ve en su perfil para
 * poder volver a declarar. Mismo patrón que `AnularPagoModal`: el
 * `ConfirmDialog` compartido no tiene campo de texto.
 */
export function RechazarDeclaracionModal({
  declaracion,
  onCancel,
  onConfirm,
  loading = false,
  error = null,
}: RechazarDeclaracionModalProps) {
  const [motivo, setMotivo] = useState('')

  const idDeclaracion = declaracion?.id_declaracion_pago
  useEffect(() => {
    if (idDeclaracion !== undefined) setMotivo('')
  }, [idDeclaracion])

  const motivoLimpio = motivo.trim()
  const motivoValido = motivoLimpio.length > 0 && motivoLimpio.length <= MAX_MOTIVO_RECHAZO

  return (
    <Modal
      open={declaracion !== null}
      onClose={onCancel}
      title="Rechazar declaración de pago"
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
            onClick={() => onConfirm(motivoLimpio)}
            loading={loading}
            disabled={!motivoValido || loading}
          >
            Rechazar
          </Button>
        </>
      }
    >
      {declaracion && (
        <div className="flex flex-col gap-4">
          <p className="text-content-muted text-xs">
            No se registra ningún cobro ni cambia el saldo de la cuota. El cliente ve el motivo en
            su perfil y puede volver a declarar el pago.
          </p>

          <DatosDeclaracion declaracion={declaracion} />

          <Input
            label="Motivo del rechazo"
            required
            multiline
            rows={3}
            maxLength={MAX_MOTIVO_RECHAZO}
            placeholder="Ej. el número de referencia no figura en el extracto bancario"
            helperText={`${motivo.length}/${MAX_MOTIVO_RECHAZO} caracteres`}
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value)}
            disabled={loading}
          />

          {error && (
            <p
              role="alert"
              className="border-error/30 bg-error/10 text-error rounded-md border px-4 py-3 text-xs"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
