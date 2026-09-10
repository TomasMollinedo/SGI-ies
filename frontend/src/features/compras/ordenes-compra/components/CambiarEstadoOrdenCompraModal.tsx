import { useEffect, useState } from 'react'
import { Check, RefreshCw, X } from 'lucide-react'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { cn } from '@/shared/utils/cn'
import { ESTADO_META, TRANSICIONES_VALIDAS } from '../config/ordenCompra.config'
import type { EstadoOrdenCompra } from '../types/ordenCompra.types'
import { formatearCodigoOrdenCompra } from '../utils/codigoOrdenCompra'

interface OrdenParaCambioEstado {
  id_orden_compra: number
  estado: EstadoOrdenCompra
}

interface CambiarEstadoOrdenCompraModalProps {
  /** Orden sobre la que se quiere avanzar el estado. Con `null` el modal está cerrado. */
  orden: OrdenParaCambioEstado | null
  onCancel: () => void
  onConfirm: (destino: EstadoOrdenCompra, observacion: string) => void
  loading?: boolean
  error?: ApiErrorResponse | null
}

/**
 * Avance manual de estado desde la fila del listado, sin pasar por el
 * detalle: a diferencia de `AvanzarEstadoOrdenCompraModal` (que ya recibe el
 * destino decidido por el botón que se tocó), acá se elige a mano entre
 * todas las transiciones válidas desde el estado actual.
 *
 * Queda preseleccionada la primera transición de `TRANSICIONES_VALIDAS`; si
 * hay más de una, se puede elegir otra antes de confirmar.
 */
export function CambiarEstadoOrdenCompraModal({
  orden,
  onCancel,
  onConfirm,
  loading = false,
  error = null,
}: CambiarEstadoOrdenCompraModalProps) {
  const transiciones = orden ? TRANSICIONES_VALIDAS[orden.estado] : []
  const [destino, setDestino] = useState<EstadoOrdenCompra | null>(null)
  const [observacion, setObservacion] = useState('')

  useEffect(() => {
    if (!orden) return
    setDestino(TRANSICIONES_VALIDAS[orden.estado][0] ?? null)
    setObservacion('')
  }, [orden])

  if (!orden || transiciones.length === 0) return null

  const esCancelacion = destino === 'CANCELADA'
  const observacionValida = !esCancelacion || observacion.trim().length > 0

  return (
    <Modal
      open
      onClose={onCancel}
      title={`${formatearCodigoOrdenCompra(orden.id_orden_compra)} · desde ${ESTADO_META[orden.estado].label}`}
      icon={<RefreshCw />}
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
            icon={<Check />}
            onClick={() => destino && onConfirm(destino, observacion.trim())}
            loading={loading}
            disabled={!destino || !observacionValida || loading}
          >
            Confirmar cambio
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-content-muted text-xs">
          El sistema no deduce el estado a partir de los movimientos de stock: lo avanza el
          Responsable de Compras.
        </p>

        <div className="flex flex-col gap-2">
          <span className="text-content-muted text-xs font-medium uppercase">
            Transiciones permitidas
          </span>

          <div className="flex flex-col gap-2">
            {transiciones.map((opcion) => {
              const admiteAvancePosterior = TRANSICIONES_VALIDAS[opcion].length > 0
              const seleccionado = destino === opcion

              return (
                <button
                  key={opcion}
                  type="button"
                  disabled={loading}
                  onClick={() => setDestino(opcion)}
                  aria-pressed={seleccionado}
                  className={cn(
                    'flex items-center justify-between rounded-md border px-4 py-2.5 text-left text-sm font-medium transition-colors',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                    seleccionado
                      ? 'border-error text-error'
                      : 'border-subtle text-content enabled:hover:border-content-muted'
                  )}
                >
                  {ESTADO_META[opcion].label}
                  {admiteAvancePosterior && (
                    <span className="text-content-muted text-xs font-normal uppercase">
                      Admite avance posterior
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <Input
          label="Observación del cambio"
          required={esCancelacion}
          multiline
          rows={3}
          placeholder={
            esCancelacion ? 'Ej. el proveedor no puede cumplir la entrega' : 'Opcional'
          }
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
