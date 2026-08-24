import { useEffect } from 'react'
import { Tag } from 'lucide-react'
import { AuditInfo } from '@/shared/components/common/AuditInfo'
import { DetailRow } from '@/shared/components/common/DetailRow'
import { Modal } from '@/shared/components/common/Modal'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { useMarcaDetalle } from '../hooks/useMarcaDetalle'
import type { UsuarioResumen } from '../types/marca.types'

interface MarcaDetalleModalProps {
  /** Marca a mostrar. Con `null` el modal está cerrado y no se pide nada. */
  idMarca: number | null
  onClose: () => void
}

const SIN_DATO = '—'

/**
 * Modal de solo lectura con los datos de una marca y su trazabilidad.
 * No edita ni da de baja: para eso están las acciones de la fila.
 */
export function MarcaDetalleModal({ idMarca, onClose }: MarcaDetalleModalProps) {
  const toast = useToast()
  const { data: marca, isPending, error, refetch } = useMarcaDetalle(idMarca)

  const esInexistente = error?.statusCode === 404

  useEffect(() => {
    if (!esInexistente) return

    toast.error('La marca no existe')
    onClose()
  }, [esInexistente, toast, onClose])

  const estaCargando = idMarca !== null && isPending

  return (
    <Modal
      open={idMarca !== null}
      onClose={onClose}
      title="Detalle de la marca"
      icon={<Tag />}
      footer={<Button onClick={onClose}>Cerrar</Button>}
    >
      {estaCargando ? (
        <div className="flex justify-center py-10">
          <Spinner size={32} />
        </div>
      ) : error && !esInexistente ? (
        // El 404 no se muestra: el efecto de arriba avisa por toast y cierra.
        <ErrorState mensaje={formatearMensajeError(error.message)} onReintentar={() => refetch()} />
      ) : marca ? (
        <div className="flex flex-col">
          <DetailRow label="Código" value={`MAR-${marca.id_marca}`} />
          <DetailRow label="Nombre" value={marca.nombre} />
          <DetailRow label="Descripción" value={marca.descripcion ?? SIN_DATO} />
          <DetailRow
            label="Estado"
            value={
              <Badge variant={marca.estado ? 'active' : 'inactive'}>
                {marca.estado ? 'Activo' : 'Inactivo'}
              </Badge>
            }
          />

          <AuditInfo
            className="mt-6"
            createdAt={marca.hora_creacion}
            createdBy={{ nombre: nombreCompleto(marca.usuarioCreador) }}
            // Una marca que nunca se editó no tiene actualizador: sin estas dos
            // props, `AuditInfo` no dibuja la columna de modificación.
            updatedAt={marca.hora_actualizacion ?? undefined}
            updatedBy={
              marca.usuarioActualizador
                ? { nombre: nombreCompleto(marca.usuarioActualizador) }
                : undefined
            }
          />
        </div>
      ) : null}
    </Modal>
  )
}

function nombreCompleto(usuario: UsuarioResumen): string {
  return `${usuario.nombre} ${usuario.apellido}`
}
