import { Eye, Undo2 } from 'lucide-react'
import { IconButton } from '@/shared/components/ui/IconButton'
import { puedeDespublicarse } from '../config/publicacion.config'
import type { PublicacionListItem } from '../types/publicacion.types'

interface AccionesPublicacionRowProps {
  publicacion: PublicacionListItem
  onVer: () => void
  onDespublicar: () => void
}

/**
 * Acciones de la fila: ver el detalle siempre; despublicar solo se renderiza si la publicación está
 * vigente y en EN_PREPARACION o DISPONIBLE; si no, no hay acciones.
 */
export function AccionesPublicacionRow({
  publicacion,
  onVer,
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
