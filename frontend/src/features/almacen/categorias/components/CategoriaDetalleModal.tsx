import { Pencil, Tag, X } from 'lucide-react'
import { AuditInfo } from '@/shared/components/common/AuditInfo'
import { DetailRow } from '@/shared/components/common/DetailRow'
import { Modal } from '@/shared/components/common/Modal'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useDetalleCategoria } from '../hooks/useDetalleCategoria'
import type { Categoria } from '../types/categoria.types'

interface CategoriaDetalleModalProps {
  id: number | null
  onClose: () => void
  onEditar: (categoria: Categoria) => void
}

/** Modal de solo lectura con el detalle completo de una categoría. */
export function CategoriaDetalleModal({ id, onClose, onEditar }: CategoriaDetalleModalProps) {
  const { data: categoria, isLoading, isError, refetch } = useDetalleCategoria(id)

  return (
    <Modal
      open={id !== null}
      onClose={onClose}
      title="Detalle de la categoría"
      icon={<Tag />}
      footer={
        <>
          <Button variant="error" icon={<X />} onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="success"
            icon={<Pencil />}
            onClick={() => categoria && onEditar(categoria)}
            disabled={!categoria}
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

      {!isLoading && !isError && categoria && (
        <div className="flex flex-col">
          <DetailRow label="Nombre" value={categoria.nombre} />
          <DetailRow label="Descripción" value={categoria.descripcion ?? '—'} />
          <DetailRow
            label="Estado"
            value={
              <Badge variant={categoria.estado ? 'active' : 'inactive'}>
                {categoria.estado ? 'Activo' : 'Inactivo'}
              </Badge>
            }
          />

          <AuditInfo
            className="mt-4"
            createdAt={categoria.hora_creacion}
            createdBy={{ nombre: nombreCompleto(categoria.usuarioCreador) }}
            updatedAt={categoria.hora_actualizacion ?? undefined}
            updatedBy={
              categoria.hora_actualizacion
                ? { nombre: nombreCompleto(categoria.usuarioActualizador) }
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
