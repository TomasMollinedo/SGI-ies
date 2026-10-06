import { Construction } from 'lucide-react'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'

/** Pantalla provisoria (T157): T154 reemplaza el contenido, sin tocar el router. */
export function TableroPage() {
  return (
    <EmptyState
      icono={Construction}
      titulo="Pantalla en construcción"
      descripcion="Se implementa en T154."
    />
  )
}
