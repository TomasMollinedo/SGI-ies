import { useEffect } from 'react'
import { Pencil, Tag, X } from 'lucide-react'
import { AuditInfo } from '@/shared/components/common/AuditInfo'
import { DetailRow } from '@/shared/components/common/DetailRow'
import { Modal } from '@/shared/components/common/Modal'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { useMarcaDetalle } from '../hooks/useMarcas'
import type { Marca, UsuarioResumen } from '../types/marca.types'

interface MarcaDetalleModalProps {
  /** Marca a mostrar. Con `null` el modal está cerrado y no se pide nada. */
  idMarca: number | null
  onClose: () => void
  /** Abre el formulario de edición con esta marca, igual que el lápiz de la fila. */
  onEditar: (marca: Marca) => void
}

const SIN_DATO = '—'

/**
 * Modal de solo lectura con los datos de una marca y su trazabilidad.
 * No da de baja: para eso está la acción de la fila. Editar sí, pero delegado:
 * el botón del pie llama a `onEditar` con la marca cargada.
 */
export function MarcaDetalleModal({ idMarca, onClose, onEditar }: MarcaDetalleModalProps) {
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
      // Mismo pie que el detalle de Depósito/Obradores: cerrar a la izquierda y
      // "Editar registro" a la derecha, deshabilitado hasta que llegue el dato.
      footer={
        <>
          <Button variant="error" icon={<X />} onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="success"
            icon={<Pencil />}
            onClick={() => marca && onEditar(marca)}
            disabled={!marca}
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
      ) : marca ? (
        <div className="flex flex-col">
          <DetailRow label="Código" value={`MAR-${marca.id_marca}`} />
          <DetailRow label="Nombre" value={marca.nombre} />
          <DetailRow label="Descripción" value={textoOSinDato(marca.descripcion)} />
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

/**
 * Un campo de texto opcional, listo para mostrar. El backend devuelve `null`
 * cuando nunca se cargó, pero string vacío cuando se editó y se borró: los dos
 * casos —y el texto que quedó en solo espacios— tienen que verse igual.
 */
function textoOSinDato(valor: string | null | undefined): string {
  return valor?.trim() || SIN_DATO
}

function nombreCompleto(usuario: UsuarioResumen): string {
  return `${usuario.nombre} ${usuario.apellido}`
}
