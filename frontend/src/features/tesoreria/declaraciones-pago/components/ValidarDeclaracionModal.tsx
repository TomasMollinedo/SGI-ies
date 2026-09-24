import { AlertTriangle, BadgeCheck, Ban, X } from 'lucide-react'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import type { DeclaracionPago } from '../types/declaracionPago.types'
import { DatosDeclaracion } from './DatosDeclaracion'

interface ValidarDeclaracionModalProps {
  /** La declaración a validar. En `null` el modal está cerrado. */
  declaracion: DeclaracionPago | null
  onCancel: () => void
  onConfirm: () => void
  /** Mientras valida, o mientras relee la declaración después de un 409. */
  loading?: boolean
  /**
   * Mensaje del backend cuando validar dio 409 y la declaración sigue
   * PENDIENTE: el saldo de la cuota ya no alcanza. En ese caso ya no se
   * ofrece validar sino ir directo al rechazo.
   */
  errorSaldo?: string | null
  /** Cualquier otro error de la operación: se muestra y se puede reintentar. */
  error?: string | null
  onIrARechazar: () => void
}

/**
 * Confirmación de la validación de una declaración (T117, HU-29): muestra lo
 * que Tesorería tiene que cotejar contra el extracto bancario antes de
 * convertirla en un cobro. Es un `Modal` propio y no el `ConfirmDialog`
 * compartido porque, cuando el saldo ya no alcanza, hace falta un tercer
 * camino: llevar al rechazo sin cerrar ni perder el contexto.
 */
export function ValidarDeclaracionModal({
  declaracion,
  onCancel,
  onConfirm,
  loading = false,
  errorSaldo = null,
  error = null,
  onIrARechazar,
}: ValidarDeclaracionModalProps) {
  return (
    <Modal
      open={declaracion !== null}
      onClose={onCancel}
      title="Validar declaración de pago"
      icon={<BadgeCheck />}
      size="sm"
      closeOnEscape={!loading}
      closeOnOverlayClick={!loading}
      footer={
        <>
          <Button variant="error" icon={<X />} onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          {errorSaldo ? (
            <Button variant="warning" icon={<Ban />} onClick={onIrARechazar} disabled={loading}>
              Rechazar declaración
            </Button>
          ) : (
            <Button
              variant="success"
              icon={<BadgeCheck />}
              onClick={onConfirm}
              loading={loading}
              disabled={loading}
            >
              Validar y registrar cobro
            </Button>
          )}
        </>
      }
    >
      {declaracion && (
        <div className="flex flex-col gap-4">
          <p className="text-content-muted text-xs">
            Verificá que el pago figure en el extracto bancario con estos datos. Al validar se
            registra un cobro de origen Ecommerce y se descuenta el importe del saldo de la cuota.
          </p>

          <DatosDeclaracion declaracion={declaracion} />

          {errorSaldo && (
            <div
              role="alert"
              className="border-warning/40 bg-warning/10 text-content flex flex-col gap-1 rounded-md border px-4 py-3 text-xs"
            >
              <span className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                No se puede validar
              </span>
              <p>{errorSaldo}</p>
              <p>
                La declaración sigue pendiente. Corresponde rechazarla, indicando el motivo al
                cliente.
              </p>
            </div>
          )}

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
