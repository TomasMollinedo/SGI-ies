import { useEffect } from 'react'
import { ClipboardList, X } from 'lucide-react'
import { AuditInfo } from '@/shared/components/common/AuditInfo'
import { DataTable } from '@/shared/components/common/DataTable'
import { DetailRow } from '@/shared/components/common/DetailRow'
import { Modal } from '@/shared/components/common/Modal'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { formatearFechaHora } from '@/shared/utils/fecha'
import { COLUMNAS_LINEAS, nombreCompleto, textoOSinDato } from '../config/movimiento.config'
import { useMovimientoDetalle } from '../hooks/useMovimientos'
import { formatearCodigoMovimiento } from '../utils/codigoMovimiento'

interface MovimientoDetalleModalProps {
  /** Movimiento a mostrar. Con `null` el modal está cerrado y no se pide nada. */
  idMovimiento: number | null
  onClose: () => void
}

/**
 * Modal de solo lectura con la cabecera de un movimiento, sus líneas y su
 * trazabilidad. Los movimientos no se editan ni se eliminan: son el registro
 * histórico de lo que pasó con el stock.
 *
 * La carga y el error viven acá adentro: la tabla de atrás no se entera y sigue
 * mostrando el listado que ya tenía.
 */
export function MovimientoDetalleModal({ idMovimiento, onClose }: MovimientoDetalleModalProps) {
  const toast = useToast()
  const { data: movimiento, isPending, error, refetch } = useMovimientoDetalle(idMovimiento)

  const esInexistente = error?.statusCode === 404

  useEffect(() => {
    if (!esInexistente) return

    toast.error('El movimiento no existe')
    onClose()
  }, [esInexistente, toast, onClose])

  const estaCargando = idMovimiento !== null && isPending

  return (
    <Modal
      open={idMovimiento !== null}
      onClose={onClose}
      title="Detalle del movimiento"
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
      ) : movimiento ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col">
            <DetailRow label="Código" value={formatearCodigoMovimiento(movimiento.id_movimiento)} />
            <DetailRow
              label="Fecha y Hora"
              value={formatearFechaHora(movimiento.fecha_movimiento)}
            />
            <DetailRow
              label="Tipo"
              value={
                <span className="inline-flex flex-wrap items-center justify-end gap-2">
                  {movimiento.tipoMovimiento.nombre}
                  <Badge variant={movimiento.tipoMovimiento.indicador_entrada ? 'active' : 'error'}>
                    {movimiento.tipoMovimiento.indicador_entrada ? 'Entrada' : 'Salida'}
                  </Badge>
                </span>
              }
            />
            <DetailRow label="Depósito" value={movimiento.deposito.nombre} />
            <DetailRow label="Referencia" value={textoOSinDato(movimiento.referencia)} />
            <DetailRow label="Observaciones" value={textoOSinDato(movimiento.observaciones)} />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-content text-sm font-medium">Detalle de artículos</span>
            <DataTable
              data={movimiento.stockMovimientos}
              columns={COLUMNAS_LINEAS}
              obtenerId={(linea) => String(linea.id_stock_movimiento)}
              ariaLabel="Líneas del movimiento"
              emptyState={
                <EmptyState
                  titulo="Este movimiento no tiene líneas registradas"
                  descripcion="No hay artículos asociados a este movimiento."
                />
              }
            />
          </div>

          {/* La trazabilidad va en su propio apartado al pie, no como una fila
              más: un movimiento no se edita, así que solo hay creación. */}
          <AuditInfo
            createdAt={movimiento.hora_creacion}
            createdBy={{ nombre: nombreCompleto(movimiento.usuarioCreador) }}
          />
        </div>
      ) : null}
    </Modal>
  )
}
