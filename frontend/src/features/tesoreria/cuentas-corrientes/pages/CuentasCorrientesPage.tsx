import { Construction } from 'lucide-react'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'

export function CuentasCorrientesPage() {
  return (
    <EmptyState
      icono={Construction}
      titulo="En construcción"
      descripcion="Esta pantalla todavía no está implementada."
    />
  )
}
