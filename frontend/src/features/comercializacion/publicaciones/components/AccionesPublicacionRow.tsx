import { Undo2 } from 'lucide-react'
import { IconButton } from '@/shared/components/ui/IconButton'
import { puedeDespublicarse } from '../config/publicacion.config'
import type { PublicacionListItem } from '../types/publicacion.types'

interface AccionesPublicacionRowProps {
  publicacion: PublicacionListItem
  onDespublicar: () => void
}

/**
 * Acciones de la fila. Despublicar solo se renderiza si la publicación está
 * vigente y en EN_PREPARACION o DISPONIBLE; si no, no hay acciones.
 */
export function AccionesPublicacionRow({
  publicacion,
  onDespublicar,
}: AccionesPublicacionRowProps) {
  const puedeDespublicar = publicacion.vigente && puedeDespublicarse(publicacion.estado_comercial)

  return (
    <div className="inline-flex items-center gap-1">
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
