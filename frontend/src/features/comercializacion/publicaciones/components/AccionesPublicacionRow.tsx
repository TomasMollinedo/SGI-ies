import { Eye, HandCoins, Undo2 } from 'lucide-react'
import { IconButton } from '@/shared/components/ui/IconButton'
import { puedeDespublicarse } from '../config/publicacion.config'
import type { PublicacionListItem } from '../types/publicacion.types'

interface AccionesPublicacionRowProps {
  publicacion: PublicacionListItem
  onVer: () => void
  onVerPlanesPago: () => void
  onDespublicar: () => void
}

/**
 * Acciones de la fila: ver el detalle y los planes de pago siempre; despublicar solo se renderiza si la publicación está
 * vigente y en EN_PREPARACION o DISPONIBLE; si no, no hay acciones.
 */
export function AccionesPublicacionRow({
  publicacion,
  onVer,
  onVerPlanesPago,
  onDespublicar,
}: AccionesPublicacionRowProps) {
  const puedeDespublicar = publicacion.vigente && puedeDespublicarse(publicacion.estado_comercial)

  return (
    <div className="inline-flex items-center gap-1">
      <IconButton
        icon={<Eye />}
        ariaLabel={`Ver detalle de ${publicacion.unidad.identificador}`}
        title="Ver detalle"
        variant="soft"
        size="sm"
        bgColor="fondo-ver"
        iconColor="info"
        onClick={onVer}
      />

      <IconButton
        icon={<HandCoins />}
        ariaLabel={`Ver planes de pago de ${publicacion.unidad.identificador}`}
        title="Ver planes de pago"
        variant="soft"
        size="sm"
        bgColor="success-soft"
        iconColor="success"
        onClick={onVerPlanesPago}
      />

      {puedeDespublicar && (
        <IconButton
          icon={<Undo2 />}
          ariaLabel={`Despublicar ${publicacion.unidad.identificador}`}
          title="Despublicar"
          variant="soft"
          size="sm"
          bgColor="fondo-eliminar"
          iconColor="error"
          onClick={onDespublicar}
        />
      )}
    </div>
  )
}
