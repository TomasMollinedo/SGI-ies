import { useEffect } from 'react'
import { ClipboardList, X } from 'lucide-react'
import { DataTable } from '@/shared/components/common/DataTable'
import { DetailRow } from '@/shared/components/common/DetailRow'
import { Modal } from '@/shared/components/common/Modal'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { formatearFechaHora, formatearFechaSinHora } from '@/shared/utils/fecha'
import { badgeEstadoOrdenCompra, COLUMNAS_LINEAS } from '../config/ordenCompra.config'
import { useOrdenCompraDetalle } from '../hooks/useOrdenesCompra'
import { formatearCodigoOrdenCompra } from '../utils/codigoOrdenCompra'
import { formatearMoneda } from '../utils/formatearMoneda'

interface OrdenCompraDetalleModalProps {
  /** Orden a mostrar. Con `null` el modal está cerrado y no se pide nada. */
  idOrdenCompra: number | null
  onClose: () => void
}

const SIN_DATO = '—'

/**
 * Modal de solo lectura con la cabecera de una orden de compra y su detalle
 * línea por línea. T69 solo pide "acceso al detalle desde cada fila" — la
 * edición, la confirmación y el cambio de estado ya tienen su propia pantalla
 * (T68) o quedan para otra historia.
 *
 * La carga y el error viven acá adentro: la tabla de atrás no se entera y
 * sigue mostrando el listado que ya tenía.
 */
export function OrdenCompraDetalleModal({ idOrdenCompra, onClose }: OrdenCompraDetalleModalProps) {
  const toast = useToast()
  const { data: orden, isPending, error, refetch } = useOrdenCompraDetalle(idOrdenCompra)

  const esInexistente = error?.statusCode === 404

  useEffect(() => {
    if (!esInexistente) return

    toast.error('La orden de compra no existe')
    onClose()
  }, [esInexistente, toast, onClose])

  const estaCargando = idOrdenCompra !== null && isPending

  return (
    <Modal
      open={idOrdenCompra !== null}
      onClose={onClose}
      title="Detalle de la orden de compra"
      icon={<ClipboardList />}
      size="lg"
      footer={
        <Button variant="error" icon={<X />} onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      {estaCargando ? (
        <div className="flex justify-center py-10">
          <Spinner size={32} />
        </div>
      ) : error && !esInexistente ? (
        // El 404 no se muestra: el efecto de arriba avisa por toast y cierra.
        <ErrorState mensaje={formatearMensajeError(error.message)} onReintentar={() => refetch()} />
      ) : orden ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col">
            <DetailRow label="Número" value={formatearCodigoOrdenCompra(orden.id_orden_compra)} />
            <DetailRow label="Estado" value={badgeEstadoOrdenCompra(orden.estado)} />
            <DetailRow
              label="Fecha de emisión"
              value={formatearFechaSinHora(orden.fecha_emision)}
            />
            <DetailRow
              label="Fecha de entrega solicitada"
              value={
                orden.fecha_entrega_solicitada
                  ? formatearFechaSinHora(orden.fecha_entrega_solicitada)
                  : SIN_DATO
              }
            />
            <DetailRow label="Proveedor" value={orden.proveedor.razon_social} />
            <DetailRow label="Depósito de destino" value={orden.deposito.nombre} />
            <DetailRow label="Observaciones" value={orden.observaciones?.trim() || SIN_DATO} />
            {orden.estado === 'CANCELADA' && (
              <DetailRow
                label="Motivo de cancelación"
                value={orden.motivo_cancelacion?.trim() || SIN_DATO}
              />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-content text-sm font-medium">Detalle de la orden</span>
            <DataTable
              data={orden.detalles}
              columns={COLUMNAS_LINEAS}
              obtenerId={(linea) => String(linea.id_detalle_orden_compra)}
              ariaLabel="Líneas de la orden de compra"
              emptyState={
                <EmptyState
                  titulo="Esta orden todavía no tiene líneas cargadas"
                  descripcion="Es un borrador sin detalle."
                />
              }
            />
            <div className="flex items-center justify-end gap-3 pt-1">
              <span className="text-content text-sm font-medium">Total de la orden</span>
              <span className="text-content text-lg font-semibold">
                {formatearMoneda(orden.total)}
              </span>
            </div>
          </div>

          {/* Sin trazabilidad de usuario: la respuesta de la API no expone
              quién creó ni quién modificó la orden (a diferencia de
              Movimiento/Proveedor/Comprobante), solo las fechas. */}
          <div className="border-subtle grid gap-6 border-t pt-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <span className="text-content-muted text-xs font-medium uppercase">Creada</span>
              <span className="text-content text-sm">
                {formatearFechaHora(orden.hora_creacion)}
              </span>
            </div>
            {orden.hora_actualizacion && (
              <div className="flex flex-col gap-1">
                <span className="text-content-muted text-xs font-medium uppercase">
                  Última modificación
                </span>
                <span className="text-content text-sm">
                  {formatearFechaHora(orden.hora_actualizacion)}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
