import { Construction } from 'lucide-react'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'

/** Pantalla provisoria (T157): T151 reemplaza el contenido, sin tocar el router. */
export function ClienteDetallePage() {
  return (
    <EmptyState
      icono={Construction}
      titulo="Pantalla en construcción"
      descripcion="Se implementa en T151."
    />
  )
}
