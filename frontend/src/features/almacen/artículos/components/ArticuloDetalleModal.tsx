import { useEffect } from 'react'
import { Package, Pencil, X } from 'lucide-react'
import { AuditInfo } from '@/shared/components/common/AuditInfo'
import { DetailRow } from '@/shared/components/common/DetailRow'
import { Modal } from '@/shared/components/common/Modal'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { useArticuloDetalle } from '../hooks/useArticulos'
import type { ArticuloDetalle, UsuarioResumen } from '../types/articulo.types'
import { formatearCodigoArticulo } from '../utils/codigoArticulo'

interface ArticuloDetalleModalProps {
  /** Artículo a mostrar. Con `null` el modal está cerrado y no se pide nada. */
  idArticulo: number | null
  onClose: () => void
  /** Abre el formulario de edición con este artículo, igual que el lápiz de la fila. */
  onEditar: (articulo: ArticuloDetalle) => void
}

const SIN_DATO = '—'

/**
 * Modal de solo lectura con los datos de un artículo y su trazabilidad.
 * No da de baja: para eso está la acción de la fila. Editar sí, pero delegado:
 * el botón del pie llama a `onEditar` con el artículo cargado.
 */
export function ArticuloDetalleModal({ idArticulo, onClose, onEditar }: ArticuloDetalleModalProps) {
  const toast = useToast()
  const { data: articulo, isPending, error, refetch } = useArticuloDetalle(idArticulo)

  const esInexistente = error?.statusCode === 404

  useEffect(() => {
    if (!esInexistente) return

    toast.error('El artículo no existe')
    onClose()
  }, [esInexistente, toast, onClose])

  const estaCargando = idArticulo !== null && isPending

  return (
    <Modal
      open={idArticulo !== null}
      onClose={onClose}
      title="Detalle del artículo"
      icon={<Package />}
      footer={
        <>
          <Button variant="error" icon={<X />} onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="success"
            icon={<Pencil />}
            onClick={() => articulo && onEditar(articulo)}
            disabled={!articulo}
          >
            Editar registro
          </Button>
        </>
      }
    >
      {estaCargando ? (
        <div className="flex justify-center py-10">
          <Spinner size={32} />
        </div>
      ) : error && !esInexistente ? (
        // El 404 no se muestra: el efecto de arriba avisa por toast y cierra.
        <ErrorState mensaje={formatearMensajeError(error.message)} onReintentar={() => refetch()} />
      ) : articulo ? (
        <div className="flex flex-col">
          <DetailRow label="Código" value={formatearCodigoArticulo(articulo.id_articulo)} />
          <DetailRow label="Nombre" value={articulo.nombre} />
          <DetailRow label="Categoría" value={articulo.categoria.nombre} />
          <DetailRow label="Marca" value={articulo.marca?.nombre ?? SIN_DATO} />
          <DetailRow label="Unidad de Medida" value={articulo.unidadMedida.nombre} />
          <DetailRow label="Descripción" value={articulo.descripcion ?? SIN_DATO} />
          <DetailRow
            label="Estado"
            value={
              <Badge variant={articulo.estado ? 'active' : 'inactive'}>
                {articulo.estado ? 'Activo' : 'Inactivo'}
              </Badge>
            }
          />

          <AuditInfo
            className="mt-6"
            createdAt={articulo.hora_creacion}
            createdBy={{ nombre: nombreCompleto(articulo.usuarioCreador) }}
            updatedAt={articulo.hora_actualizacion ?? undefined}
            updatedBy={{ nombre: nombreCompleto(articulo.usuarioActualizador) }}
          />
        </div>
      ) : null}
    </Modal>
  )
}

function nombreCompleto(usuario: UsuarioResumen): string {
  return `${usuario.nombre} ${usuario.apellido}`
}
