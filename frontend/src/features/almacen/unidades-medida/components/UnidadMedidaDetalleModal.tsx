import { Pencil, Ruler, X } from 'lucide-react'
import { AuditInfo } from '@/shared/components/common/AuditInfo'
import { DetailRow } from '@/shared/components/common/DetailRow'
import { Modal } from '@/shared/components/common/Modal'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useUnidadMedidaDetalle } from '../hooks/useUnidadesMedida'
import type { UnidadMedida } from '../types/unidadMedida.types'

interface UnidadMedidaDetalleModalProps {
  id: number | null
  onClose: () => void
  onEditar: (unidadMedida: UnidadMedida) => void
}

/** Modal de solo lectura con el detalle completo de una unidad de medida. */
export function UnidadMedidaDetalleModal({ id, onClose, onEditar }: UnidadMedidaDetalleModalProps) {
  const { data: unidadMedida, isLoading, isError, refetch } = useUnidadMedidaDetalle(id)

  return (
    <Modal
      open={id !== null}
      onClose={onClose}
      title="Detalle de la unidad de medida"
      icon={<Ruler />}
      footer={
        <>
          <Button variant="error" icon={<X />} onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="success"
            icon={<Pencil />}
            onClick={() => unidadMedida && onEditar(unidadMedida)}
            disabled={!unidadMedida}
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

      {!isLoading && !isError && unidadMedida && (
        <div className="flex flex-col">
          <DetailRow label="Nombre" value={unidadMedida.nombre} />
          <DetailRow label="Abreviatura" value={unidadMedida.abreviatura} />
          <DetailRow
            label="Estado"
            value={
              <Badge variant={unidadMedida.estado ? 'active' : 'inactive'}>
                {unidadMedida.estado ? 'Activo' : 'Dado de baja'}
              </Badge>
            }
          />

          <AuditInfo
            className="mt-4"
            createdAt={unidadMedida.hora_creacion}
            createdBy={{ nombre: nombreCompleto(unidadMedida.usuarioCreador) }}
            updatedAt={unidadMedida.hora_actualizacion ?? undefined}
            updatedBy={
              unidadMedida.hora_actualizacion
                ? { nombre: nombreCompleto(unidadMedida.usuarioActualizador) }
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
