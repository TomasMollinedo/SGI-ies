import { useEffect } from 'react'
import { Pencil, Truck, X } from 'lucide-react'
import { AuditInfo } from '@/shared/components/common/AuditInfo'
import { DetailRow } from '@/shared/components/common/DetailRow'
import { Modal } from '@/shared/components/common/Modal'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { useCondicionesIva, useProveedorDetalle } from '../hooks/useProveedores'
import type { Proveedor, UsuarioResumen } from '../types/proveedor.types'

interface ProveedorDetalleModalProps {
  /** Proveedor a mostrar. Con `null` el modal está cerrado y no se pide nada. */
  idProveedor: number | null
  onClose: () => void
  /** Abre el formulario de edición con este proveedor, igual que el lápiz de la fila. */
  onEditar: (proveedor: Proveedor) => void
}

const SIN_DATO = '—'

/**
 * Modal de solo lectura con los datos de un proveedor y su trazabilidad.
 * No da de baja ni reactiva: para eso están las acciones de la fila. Editar
 * sí, pero delegado: el botón del pie llama a `onEditar` con el proveedor cargado.
 */
export function ProveedorDetalleModal({
  idProveedor,
  onClose,
  onEditar,
}: ProveedorDetalleModalProps) {
  const toast = useToast()
  const { data: proveedor, isPending, error, refetch } = useProveedorDetalle(idProveedor)

  // El detalle usa el mismo catálogo que la tabla y el filtro, para traducir el
  // `id` de la condición IVA al `code` que se le muestra al usuario.
  const { data: condicionesIva } = useCondicionesIva()
  const codigoCondicionIva = proveedor
    ? (condicionesIva?.find((item) => item.id === proveedor.condicion_iva)?.code ??
      proveedor.condicion_iva)
    : ''

  const esInexistente = error?.statusCode === 404

  useEffect(() => {
    if (!esInexistente) return

    toast.error('El proveedor no existe')
    onClose()
  }, [esInexistente, toast, onClose])

  const estaCargando = idProveedor !== null && isPending

  return (
    <Modal
      open={idProveedor !== null}
      onClose={onClose}
      title="Detalle del proveedor"
      icon={<Truck />}
      footer={
        <>
          <Button variant="error" icon={<X />} onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="success"
            icon={<Pencil />}
            onClick={() => proveedor && onEditar(proveedor)}
            disabled={!proveedor}
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
      ) : proveedor ? (
        <div className="flex flex-col">
          <DetailRow label="Razón Social" value={proveedor.razon_social} />
          <DetailRow label="CUIT" value={proveedor.cuit} />
          <DetailRow label="Condición frente al IVA" value={codigoCondicionIva} />
          <DetailRow label="Domicilio" value={textoOSinDato(proveedor.domicilio)} />
          <DetailRow label="Teléfono" value={textoOSinDato(proveedor.telefono)} />
          <DetailRow label="Correo" value={textoOSinDato(proveedor.correo)} />
          <DetailRow label="Observaciones" value={textoOSinDato(proveedor.observaciones)} />
          <DetailRow
            label="Estado"
            value={
              <Badge variant={proveedor.estado ? 'active' : 'inactive'}>
                {proveedor.estado ? 'Activo' : 'Inactivo'}
              </Badge>
            }
          />

          <AuditInfo
            className="mt-6"
            createdAt={proveedor.hora_creacion}
            createdBy={{ nombre: nombreCompleto(proveedor.usuarioCreador) }}
            // Un proveedor que nunca se editó no tiene actualizador: sin estas
            // dos props, `AuditInfo` no dibuja la columna de modificación.
            updatedAt={proveedor.hora_actualizacion ?? undefined}
            updatedBy={
              proveedor.usuarioActualizador
                ? { nombre: nombreCompleto(proveedor.usuarioActualizador) }
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
function textoOSinDato(valor: string | null): string {
  return valor?.trim() || SIN_DATO
}

function nombreCompleto(usuario: UsuarioResumen): string {
  return `${usuario.nombre} ${usuario.apellido}`
}
