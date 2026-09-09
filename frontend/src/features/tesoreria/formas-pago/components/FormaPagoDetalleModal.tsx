import { useEffect } from 'react'
import { Coins, Pencil, X } from 'lucide-react'
import { AuditInfo } from '@/shared/components/common/AuditInfo'
import { DetailRow } from '@/shared/components/common/DetailRow'
import { Modal } from '@/shared/components/common/Modal'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { SIN_DATO } from '../config/formaPago.config'
import { useFormaPagoDetalle } from '../hooks/useFormasPago'
import type { FormaPago, UsuarioResumen } from '../types/formaPago.types'
import { formatearCodigoFormaPago } from '../utils/codigoFormaPago'

interface FormaPagoDetalleModalProps {
  /** Forma de pago a mostrar. Con `null` el modal está cerrado y no se pide nada. */
  idFormaPago: number | null
  onClose: () => void
  /** Abre el formulario de edición con este registro, igual que el lápiz de la fila. */
  onEditar: (formaPago: FormaPago) => void
}

/**
 * Modal de solo lectura con los datos de una forma de pago y su trazabilidad.
 * No da de baja: para eso está la acción de la fila. Editar sí, pero delegado:
 * el botón del pie llama a `onEditar` con el registro cargado.
 *
 * La carga y el error viven acá adentro: la tabla de atrás no se entera y sigue
 * mostrando el listado que ya tenía.
 */
export function FormaPagoDetalleModal({
  idFormaPago,
  onClose,
  onEditar,
}: FormaPagoDetalleModalProps) {
  const toast = useToast()
  const { data: formaPago, isPending, error, refetch } = useFormaPagoDetalle(idFormaPago)

  const esInexistente = error?.statusCode === 404

  useEffect(() => {
    if (!esInexistente) return

    toast.error('La forma de pago no existe')
    onClose()
  }, [esInexistente, toast, onClose])

  const estaCargando = idFormaPago !== null && isPending

  return (
    <Modal
      open={idFormaPago !== null}
      onClose={onClose}
      title="Detalle de la forma de pago"
      icon={<Coins />}
      footer={
        <>
          <Button variant="error" icon={<X />} onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="success"
            icon={<Pencil />}
            onClick={() => formaPago && onEditar(formaPago)}
            disabled={!formaPago}
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
      ) : formaPago ? (
        <div className="flex flex-col">
          <DetailRow label="Código" value={formatearCodigoFormaPago(formaPago.id_forma_pago)} />
          <DetailRow label="Nombre" value={formaPago.nombre} />
          <DetailRow label="Descripción" value={textoOSinDato(formaPago.descripcion)} />
          <DetailRow
            label="Requiere número de referencia"
            value={formaPago.requiere_referencia ? 'Sí' : 'No'}
          />
          <DetailRow
            label="Estado"
            value={
              <Badge variant={formaPago.estado ? 'active' : 'inactive'}>
                {formaPago.estado ? 'Activo' : 'Inactivo'}
              </Badge>
            }
          />

          <AuditInfo
            className="mt-6"
            createdAt={formaPago.hora_creacion}
            createdBy={{ nombre: nombreCompleto(formaPago.usuarioCreador) }}
            // Una forma de pago que nunca se editó puede no tener fecha de
            // modificación: sin estas dos props, `AuditInfo` no dibuja la
            // columna.
            updatedAt={formaPago.hora_actualizacion ?? undefined}
            updatedBy={
              formaPago.hora_actualizacion
                ? { nombre: nombreCompleto(formaPago.usuarioActualizador) }
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
