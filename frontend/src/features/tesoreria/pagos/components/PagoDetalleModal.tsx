import { useEffect } from 'react'
import { Ban, Banknote, X } from 'lucide-react'
import { AuditInfo } from '@/shared/components/common/AuditInfo'
import { DataTable } from '@/shared/components/common/DataTable'
import { DetailRow } from '@/shared/components/common/DetailRow'
import { Modal } from '@/shared/components/common/Modal'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { formatearFecha } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import {
  COLUMNAS_DETALLE_PAGO,
  badgeEstadoPago,
  nombreCompleto,
  textoOSinDato,
} from '../config/pago.config'
import { usePagoDetalle } from '../hooks/usePagos'
import type { PagoDetalle } from '../types/pago.types'
import { formatearCodigoPago } from '../utils/codigoPago'

interface PagoDetalleModalProps {
  /** Pago a mostrar. Con `null` el modal está cerrado y no se pide nada. */
  idPago: number | null
  onClose: () => void
  /**
   * Abre el modal de anulación con este pago (solo disponible en
   * CONFIRMADA). Sin este prop el modal queda de solo lectura — así lo usa
   * cuenta corriente, que no puede anular pagos.
   */
  onAnular?: (pago: PagoDetalle) => void
}

/**
 * Modal de solo lectura con la cabecera de un pago, sus datos bancarios (foto
 * al momento de confirmarlo, HU-12), el detalle de comprobantes imputados y su
 * trazabilidad. Anular se delega: el botón del pie llama a `onAnular` con el
 * pago ya cargado.
 */
export function PagoDetalleModal({ idPago, onClose, onAnular }: PagoDetalleModalProps) {
  const toast = useToast()
  const { data: pago, isPending, error, refetch } = usePagoDetalle(idPago)

  const esInexistente = error?.statusCode === 404

  useEffect(() => {
    if (!esInexistente) return
    toast.error('El pago no existe')
    onClose()
  }, [esInexistente, toast, onClose])

  const estaCargando = idPago !== null && isPending
  const hayDatosBancarios =
    pago?.banco_utilizado || pago?.titular_utilizado || pago?.cbu_utilizado || pago?.alias_utilizado

  return (
    <Modal
      open={idPago !== null}
      onClose={onClose}
      title="Detalle del pago"
      icon={<Banknote />}
      size="lg"
      footer={
        <>
          <Button variant="error" icon={<X />} onClick={onClose}>
            Cerrar
          </Button>
          {onAnular && pago?.estado === 'CONFIRMADA' && (
            <Button variant="error" icon={<Ban />} onClick={() => onAnular(pago)}>
              Anular
            </Button>
          )}
        </>
      }
    >
      {estaCargando ? (
        <div className="flex justify-center py-10">
          <Spinner size={32} />
        </div>
      ) : error && !esInexistente ? (
        <ErrorState mensaje={formatearMensajeError(error.message)} onReintentar={() => refetch()} />
      ) : pago ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col">
            <DetailRow label="Pago" value={formatearCodigoPago(pago.id_pago)} />
            <DetailRow label="Proveedor" value={pago.proveedor.razon_social} />
            <DetailRow label="Forma de pago" value={pago.formaPago.nombre} />
            <DetailRow label="Fecha de pago" value={formatearFecha(pago.fecha_pago)} />
            <DetailRow label="N.º de referencia" value={textoOSinDato(pago.numero_referencia)} />
            <DetailRow label="Observaciones" value={textoOSinDato(pago.observaciones)} />
            <DetailRow label="Estado" value={badgeEstadoPago(pago.estado)} />
            {pago.estado === 'ANULADA' && (
              <DetailRow label="Motivo de anulación" value={textoOSinDato(pago.motivo_anulacion)} />
            )}
          </div>

          {hayDatosBancarios && (
            <div className="flex flex-col">
              <span className="text-content mb-2 text-sm font-medium">
                Datos bancarios utilizados
              </span>
              <DetailRow label="Banco" value={textoOSinDato(pago.banco_utilizado)} />
              <DetailRow label="Titular" value={textoOSinDato(pago.titular_utilizado)} />
              <DetailRow label="CBU" value={textoOSinDato(pago.cbu_utilizado)} />
              <DetailRow label="Alias" value={textoOSinDato(pago.alias_utilizado)} />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-content text-sm font-medium">Comprobantes imputados</span>
            <DataTable
              data={pago.detalle}
              columns={COLUMNAS_DETALLE_PAGO}
              obtenerId={(linea) => String(linea.id_detalle_pago)}
              ariaLabel="Comprobantes imputados"
              emptyState={
                <EmptyState
                  titulo="Este pago no tiene comprobantes imputados"
                  descripcion="No debería pasar: todo pago exige al menos una imputación al confirmarse."
                />
              }
            />
          </div>

          <dl className="border-subtle flex flex-col gap-1 border-t pt-3 text-sm">
            <div className="flex justify-between gap-8">
              <dt className="text-content font-medium">Importe total</dt>
              <dd className="text-content text-lg font-semibold">
                {formatearImporte(pago.importe_total)}
              </dd>
            </div>
          </dl>

          <AuditInfo
            createdAt={pago.hora_creacion}
            createdBy={{ nombre: nombreCompleto(pago.usuarioCreador) }}
            updatedAt={pago.hora_actualizacion ?? undefined}
            updatedBy={{ nombre: nombreCompleto(pago.usuarioActualizador) }}
          />
        </div>
      ) : null}
    </Modal>
  )
}
