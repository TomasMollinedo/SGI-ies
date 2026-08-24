import { Pencil, Warehouse, X } from 'lucide-react'
import { AuditInfo } from '@/shared/components/common/AuditInfo'
import { DetailRow } from '@/shared/components/common/DetailRow'
import { Modal } from '@/shared/components/common/Modal'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useDepositoDetalle } from '../hooks/useDepositos'
import type { Deposito } from '../types/deposito.types'

interface DepositoDetalleModalProps {
  id: number | null
  onClose: () => void
  onEditar: (deposito: Deposito) => void
}

/** Modal de solo lectura con el detalle completo de un depósito u obrador. */
export function DepositoDetalleModal({ id, onClose, onEditar }: DepositoDetalleModalProps) {
  const { data: deposito, isLoading, isError, refetch } = useDepositoDetalle(id)

  return (
    <Modal
      open={id !== null}
      onClose={onClose}
      title="Detalle del depósito"
      icon={<Warehouse />}
      footer={
        <>
          <Button variant="error" icon={<X />} onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="success"
            icon={<Pencil />}
            onClick={() => deposito && onEditar(deposito)}
            disabled={!deposito}
          >
            Editar registro
          </Button>
        </>
      }
    >
      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner className="text-primary size-8" />
        </div>
      )}

      {isError && <ErrorState onReintentar={() => refetch()} />}

      {!isLoading && !isError && deposito && (
        <div className="flex flex-col">
          <DetailRow label="Nombre" value={deposito.nombre} />
          <DetailRow label="Tipo" value={deposito.es_obrador ? 'Obrador' : 'Depósito'} />
          <DetailRow label="Ubicación" value={deposito.ubicacion ?? '—'} />
          <DetailRow
            label="Proyecto asignado"
            value={deposito.FK_Proyecto ? String(deposito.FK_Proyecto) : '—'}
          />
          <DetailRow label="Descripción" value={deposito.descripcion ?? '—'} />
          <DetailRow
            label="Estado"
            value={
              <Badge variant={deposito.estado ? 'active' : 'inactive'}>
                {deposito.estado ? 'Activo' : 'Dado de baja'}
              </Badge>
            }
          />

          <AuditInfo
            className="mt-4"
            createdAt={deposito.hora_creacion}
            createdBy={{ nombre: nombreCompleto(deposito.usuarioCreador) }}
            updatedAt={deposito.hora_actualizacion ?? undefined}
            updatedBy={
              deposito.hora_actualizacion
                ? { nombre: nombreCompleto(deposito.usuarioActualizador) }
                : undefined
            }
          />
        </div>
      )}
    </Modal>
  )
}

function nombreCompleto(usuario: { nombre: string; apellido: string }): string {
  return `${usuario.nombre} ${usuario.apellido}`
}
