import { useEffect } from 'react'
import { ArrowLeftRight, Pencil, X } from 'lucide-react'
import { AuditInfo } from '@/shared/components/common/AuditInfo'
import { DetailRow } from '@/shared/components/common/DetailRow'
import { Modal } from '@/shared/components/common/Modal'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { SIN_DATO, etiquetaIndicador } from '../config/tipoMovimiento.config'
import { useTipoMovimientoDetalle } from '../hooks/useTiposMovimiento'
import type { TipoMovimiento, UsuarioResumen } from '../types/tipoMovimiento.types'
import { formatearCodigoTipoMovimiento } from '../utils/codigoTipoMovimiento'

interface TipoMovimientoDetalleModalProps {
  /** Tipo de movimiento a mostrar. Con `null` el modal está cerrado y no se pide nada. */
  idTipoMovimiento: number | null
  onClose: () => void
  /** Abre el formulario de edición con este registro, igual que el lápiz de la fila. */
  onEditar: (tipoMovimiento: TipoMovimiento) => void
}

/**
 * Modal de solo lectura con los datos de un tipo de movimiento y su
 * trazabilidad. No da de baja: para eso está la acción de la fila. Editar sí,
 * pero delegado: el botón del pie llama a `onEditar` con el registro cargado.
 *
 * La carga y el error viven acá adentro: la tabla de atrás no se entera y sigue
 * mostrando el listado que ya tenía.
 */
export function TipoMovimientoDetalleModal({
  idTipoMovimiento,
  onClose,
  onEditar,
}: TipoMovimientoDetalleModalProps) {
  const toast = useToast()
  const {
    data: tipoMovimiento,
    isPending,
    error,
    refetch,
  } = useTipoMovimientoDetalle(idTipoMovimiento)

  const esInexistente = error?.statusCode === 404

  useEffect(() => {
    if (!esInexistente) return

    toast.error('El tipo de movimiento no existe')
    onClose()
  }, [esInexistente, toast, onClose])

  const estaCargando = idTipoMovimiento !== null && isPending

  return (
    <Modal
      open={idTipoMovimiento !== null}
      onClose={onClose}
      title="Detalle del tipo de movimiento"
      icon={<ArrowLeftRight />}
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
            onClick={() => tipoMovimiento && onEditar(tipoMovimiento)}
            disabled={!tipoMovimiento}
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
      ) : tipoMovimiento ? (
        <div className="flex flex-col">
          <DetailRow
            label="Código"
            value={formatearCodigoTipoMovimiento(tipoMovimiento.id_tipo_movimiento)}
          />
          <DetailRow label="Nombre" value={tipoMovimiento.nombre} />
          <DetailRow label="Descripción" value={textoOSinDato(tipoMovimiento.descripcion)} />
          <DetailRow
            label="Indicador"
            value={etiquetaIndicador(tipoMovimiento.indicador_entrada)}
          />
          <DetailRow
            label="Estado"
            value={
              <Badge variant={tipoMovimiento.estado ? 'active' : 'inactive'}>
                {tipoMovimiento.estado ? 'Activo' : 'Inactivo'}
              </Badge>
            }
          />

          <AuditInfo
            className="mt-6"
            createdAt={tipoMovimiento.hora_creacion}
            createdBy={{ nombre: nombreCompleto(tipoMovimiento.usuarioCreador) }}
            // Un tipo de movimiento que nunca se editó no tiene fecha de
            // modificación: sin estas dos props, `AuditInfo` no dibuja la
            // columna. Que falte el usuario no la oculta — la fecha sigue
            // siendo un dato útil.
            updatedAt={tipoMovimiento.hora_actualizacion ?? undefined}
            updatedBy={
              tipoMovimiento.hora_actualizacion
                ? { nombre: nombreCompleto(tipoMovimiento.usuarioActualizador) }
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

function nombreCompleto(usuario: UsuarioResumen | null): string {
  if (!usuario) return SIN_DATO

  return `${usuario.nombre} ${usuario.apellido}`
}
