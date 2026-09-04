import { useEffect } from 'react'
import { FileText, Pencil, TrendingDown, TrendingUp, X } from 'lucide-react'
import { AuditInfo } from '@/shared/components/common/AuditInfo'
import { DetailRow } from '@/shared/components/common/DetailRow'
import { Modal } from '@/shared/components/common/Modal'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { SIN_DATO } from '../config/tipoComprobante.config'
import { useTipoComprobanteDetalle } from '../hooks/useTiposComprobante'
import type { TipoComprobante, UsuarioResumen } from '../types/tipoComprobante.types'
import { formatearCodigoTipoComprobante } from '../utils/codigoTipoComprobante'

interface TipoComprobanteDetalleModalProps {
  /** Tipo de comprobante a mostrar. Con `null` el modal está cerrado y no se pide nada. */
  idTipoComprobante: number | null
  onClose: () => void
  /** Abre el formulario de edición con este registro, igual que el lápiz de la fila. */
  onEditar: (tipoComprobante: TipoComprobante) => void
}

/**
 * Modal de solo lectura con los datos de un tipo de comprobante y su
 * trazabilidad. No da de baja: para eso está la acción de la fila. Editar sí,
 * pero delegado: el botón del pie llama a `onEditar` con el registro cargado.
 *
 * La carga y el error viven acá adentro: la tabla de atrás no se entera y sigue
 * mostrando el listado que ya tenía.
 */
export function TipoComprobanteDetalleModal({
  idTipoComprobante,
  onClose,
  onEditar,
}: TipoComprobanteDetalleModalProps) {
  const toast = useToast()
  const {
    data: tipoComprobante,
    isPending,
    error,
    refetch,
  } = useTipoComprobanteDetalle(idTipoComprobante)

  const esInexistente = error?.statusCode === 404

  useEffect(() => {
    if (!esInexistente) return

    toast.error('El tipo de comprobante no existe')
    onClose()
  }, [esInexistente, toast, onClose])

  const estaCargando = idTipoComprobante !== null && isPending

  return (
    <Modal
      open={idTipoComprobante !== null}
      onClose={onClose}
      title="Detalle del tipo de comprobante"
      icon={<FileText />}
      // Mismo pie que el detalle de Tipo de Movimiento: cerrar a la izquierda y
      // "Editar registro" a la derecha, deshabilitado hasta que llegue el dato.
      footer={
        <>
          <Button variant="error" icon={<X />} onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="success"
            icon={<Pencil />}
            onClick={() => tipoComprobante && onEditar(tipoComprobante)}
            disabled={!tipoComprobante}
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
      ) : tipoComprobante ? (
        <div className="flex flex-col">
          <DetailRow
            label="Código"
            value={formatearCodigoTipoComprobante(tipoComprobante.id_tipo_comprobante)}
          />
          <DetailRow label="Nombre" value={tipoComprobante.nombre} />
          <DetailRow label="Descripción" value={textoOSinDato(tipoComprobante.descripcion)} />
          <DetailRow
            label="Efecto sobre el saldo"
            value={
              <Badge variant={tipoComprobante.aumenta_saldo ? 'active' : 'error'} dot={false}>
                {tipoComprobante.aumenta_saldo ? (
                  <TrendingUp className="size-3.5" aria-hidden="true" />
                ) : (
                  <TrendingDown className="size-3.5" aria-hidden="true" />
                )}
                {tipoComprobante.aumenta_saldo ? 'Aumenta' : 'Disminuye'}
              </Badge>
            }
          />
          <DetailRow
            label="Requiere comprobante de origen"
            value={tipoComprobante.requiere_comprobante_origen ? 'Sí' : 'No'}
          />
          <DetailRow
            label="Estado"
            value={
              <Badge variant={tipoComprobante.estado ? 'active' : 'inactive'}>
                {tipoComprobante.estado ? 'Activo' : 'Inactivo'}
              </Badge>
            }
          />

          <AuditInfo
            className="mt-6"
            createdAt={tipoComprobante.hora_creacion}
            createdBy={{ nombre: nombreCompleto(tipoComprobante.usuarioCreador) }}
            // Un tipo de comprobante que nunca se editó no tiene fecha de
            // modificación: sin estas dos props, `AuditInfo` no dibuja la
            // columna. Que falte el usuario no la oculta — la fecha sigue
            // siendo un dato útil.
            updatedAt={tipoComprobante.hora_actualizacion ?? undefined}
            updatedBy={
              tipoComprobante.hora_actualizacion
                ? { nombre: nombreCompleto(tipoComprobante.usuarioActualizador) }
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
