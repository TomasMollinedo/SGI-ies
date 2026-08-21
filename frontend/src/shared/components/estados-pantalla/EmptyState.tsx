import { Inbox, type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  titulo: string
  descripcion?: string
  icono?: LucideIcon
}

export function EmptyState({ titulo, descripcion, icono: Icono = Inbox }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Icono className="text-content-muted" size={40} />
      <p className="text-content font-medium">{titulo}</p>
      {descripcion && <p className="text-content-muted text-sm">{descripcion}</p>}
    </div>
  )
}
