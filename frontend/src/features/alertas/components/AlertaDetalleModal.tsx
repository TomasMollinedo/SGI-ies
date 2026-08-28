import { Bell, Check, X } from 'lucide-react'
import { DetailRow } from '@/shared/components/common/DetailRow'
import { Modal } from '@/shared/components/common/Modal'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { formatearFechaHora } from '@/shared/utils/fecha'
import { useAlertaDetalle, useAtenderAlerta } from '../hooks/useAlertas'

interface AlertaDetalleModalProps {
  id: number | null
  onClose: () => void
}

/** Modal de solo lectura con el detalle completo de una alerta, con acción para marcarla como atendida. */
export function AlertaDetalleModal({ id, onClose }: AlertaDetalleModalProps) {
  const { data: alerta, isLoading, isError, refetch } = useAlertaDetalle(id)
  const atender = useAtenderAlerta()
  const toast = useToast()

  function manejarAtender() {
    if (!alerta) return

    atender.mutate(alerta.id_alerta, {
      onSuccess: () => toast.success('Alerta marcada como atendida.'),
      onError: (error) => {
        if (error.statusCode === 409) {
          toast.warning('Esta alerta ya fue atendida.')
          refetch()
        } else {
          toast.error(formatearMensajeError(error.message))
        }
      },
    })
  }

  return (
    <Modal
      open={id !== null}
      onClose={onClose}
      title="Detalle de la alerta"
      icon={<Bell />}
      footer={
        <>
          <Button variant="error" icon={<X />} onClick={onClose}>
            Cerrar
          </Button>
          {alerta && !alerta.atendida && (
            <Button
              variant="success"
              icon={<Check />}
              onClick={manejarAtender}
              loading={atender.isPending}
            >
              Marcar como atendida
            </Button>
          )}
        </>
      }
    >
      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner className="text-primary size-8" />
        </div>
      )}

      {isError && <ErrorState onReintentar={() => refetch()} />}

      {!isLoading && !isError && alerta && (
        <div className="flex flex-col">
          <DetailRow label="Tipo" value={alerta.tipoAlerta.nombre} />
          <DetailRow label="Mensaje" value={alerta.mensaje} />
          <DetailRow label="Rol destinatario" value={alerta.rolDestinatario.nombre} />
          <DetailRow
            label="Estado"
            value={
              <Badge variant={alerta.atendida ? 'active' : 'inactive'}>
                {alerta.atendida ? 'Atendida' : 'Pendiente'}
              </Badge>
            }
          />
          <DetailRow label="Creada" value={formatearFechaHora(alerta.hora_creacion)} />
          {alerta.atendida && alerta.usuarioAtencion && (
            <DetailRow
              label="Atendida por"
              value={`${alerta.usuarioAtencion.nombre} ${alerta.usuarioAtencion.apellido}`}
            />
          )}
          {alerta.atendida && alerta.fecha_atencion && (
            <DetailRow
              label="Fecha de atención"
              value={formatearFechaHora(alerta.fecha_atencion)}
            />
          )}
        </div>
      )}
    </Modal>
  )
}
