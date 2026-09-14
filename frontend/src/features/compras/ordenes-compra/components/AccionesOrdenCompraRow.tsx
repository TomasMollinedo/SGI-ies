import { Eye, Pencil, RefreshCw } from 'lucide-react'
import { IconButton } from '@/shared/components/ui/IconButton'
import { TRANSICIONES_VALIDAS } from '../config/ordenCompra.config'
import type { OrdenCompraListItem } from '../types/ordenCompra.types'

interface AccionesOrdenCompraRowProps {
  orden: OrdenCompraListItem
  onVer: () => void
  onEditar: () => void
  onCambiarEstado: () => void
  /** Bloquea editar / cambiar estado mientras hay una operación en curso. */
  bloqueado?: boolean
}

/**
 * Acciones de la fila del listado, según el estado de la orden:
 * - BORRADOR: ver, editar y cambiar estado (a EMITIDA).
 * - EMITIDA / RECIBIDA_PARCIAL: ver y cambiar estado.
 * - RECIBIDA / CANCELADA: solo ver, son estados finales.
 *
 * Mismo patrón que `AccionesComprobanteRow`: íconos redondos, sin texto.
 */
export function AccionesOrdenCompraRow({
  orden,
  onVer,
  onEditar,
  onCambiarEstado,
  bloqueado = false,
}: AccionesOrdenCompraRowProps) {
  const esBorrador = orden.estado === 'BORRADOR'
  const puedeCambiarEstado = TRANSICIONES_VALIDAS[orden.estado].length > 0

  return (
    <div className="inline-flex items-center gap-1">
      <IconButton
        icon={<Eye />}
        ariaLabel="Ver detalle"
        variant="soft"
        size="sm"
        bgColor="fondo-ver"
        iconColor="info"
        onClick={onVer}
      />

      {esBorrador && (
        <IconButton
          icon={<Pencil />}
          ariaLabel="Editar orden de compra"
          variant="soft"
          size="sm"
          bgColor="fondo-editar"
          iconColor="warning"
          disabled={bloqueado}
          onClick={onEditar}
        />
      )}

      {puedeCambiarEstado && (
        <IconButton
          icon={<RefreshCw />}
          ariaLabel="Cambiar estado"
          variant="soft"
          size="sm"
          bgColor="fondo-reactivar"
          iconColor="reactivar"
          disabled={bloqueado}
          onClick={onCambiarEstado}
        />
      )}
    </div>
  )
}
