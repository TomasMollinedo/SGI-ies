import { useEffect, useState } from 'react'
import { Undo2, X } from 'lucide-react'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { AlertaInline } from '@/features/comercializacion/publicaciones/components/AlertaInline'
import { useCancelarVenta } from '../hooks/useVentas'

const MAX_MOTIVO = 500

/** Lo mínimo que el modal necesita saber de la venta a cancelar. */
export interface VentaACancelar {
  id_venta: number
  identificadorUnidad: string
}

interface CancelarVentaModalProps {
  venta: VentaACancelar | null
  onClose: () => void
  onCancelada: () => void
}

/**
 * Modal de cancelación de venta (HU-27): pide motivo obligatorio y llama
 * PATCH /ventas/:id/cancelar — la unidad vuelve a Disponible. Mismo patrón
 * que `DespublicarPublicacionModal`.
 */
export function CancelarVentaModal({ venta, onClose, onCancelada }: CancelarVentaModalProps) {
  const toast = useToast()
  const cancelar = useCancelarVenta()
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<ApiErrorResponse | null>(null)

  const idVenta = venta?.id_venta ?? null
  useEffect(() => {
    setMotivo('')
    setError(null)
  }, [idVenta])

  const motivoLimpio = motivo.trim()
  const motivoValido = motivoLimpio.length > 0 && motivoLimpio.length <= MAX_MOTIVO
  const cargando = cancelar.isPending

  function confirmar() {
    if (!venta || !motivoValido) return

    setError(null)
    cancelar.mutate(
      { id: venta.id_venta, payload: { motivo_cancelacion: motivoLimpio } },
      {
        onSuccess: () => {
          toast.success(`Venta de la unidad ${venta.identificadorUnidad} cancelada.`)
          onCancelada()
        },
        onError: (falla) => setError(falla),
      }
    )
  }

  return (
    <Modal
      open={venta !== null}
      onClose={onClose}
      title="Cancelar venta"
      icon={<Undo2 />}
      size="sm"
      closeOnEscape={!cargando}
      closeOnOverlayClick={!cargando}
      footer={
        <>
          <Button variant="error" icon={<X />} onClick={onClose} disabled={cargando}>
            Volver
          </Button>
          <Button
            variant="success"
            icon={<Undo2 />}
            onClick={confirmar}
            loading={cargando}
            disabled={!motivoValido || cargando}
          >
            Cancelar venta
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {venta && (
          <p className="text-content text-sm font-medium break-words">
            Unidad {venta.identificadorUnidad}
          </p>
        )}

        <div className="flex flex-col gap-1">
          <Input
            label="Motivo de la cancelación"
            required
            multiline
            rows={3}
            maxLength={MAX_MOTIVO}
            placeholder="Ej. el cliente se arrepintió"
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value)}
            disabled={cargando}
          />
          <p className="text-content-muted text-right text-xs" aria-live="polite">
            {motivo.length}/{MAX_MOTIVO}
          </p>
        </div>

        {error && <AlertaInline>{formatearMensajeError(error.message)}</AlertaInline>}
      </div>
    </Modal>
  )
}
