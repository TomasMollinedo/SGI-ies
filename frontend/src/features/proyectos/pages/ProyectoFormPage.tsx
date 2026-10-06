import { Construction } from 'lucide-react'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'

type Modo = 'crear' | 'editar'

interface ProyectoFormPageProps {
  modo: Modo
}

/** Pantalla provisoria (T157): T123 reemplaza el contenido, sin tocar el router. */
export function ProyectoFormPage({ modo }: ProyectoFormPageProps) {
  return (
    <EmptyState
      icono={Construction}
      titulo="Pantalla en construcción"
      descripcion={`Se implementa en T123 (modo ${modo}).`}
    />
  )
}
