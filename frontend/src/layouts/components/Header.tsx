import { Menu } from 'lucide-react'
import { useMatches } from 'react-router'
import { AlertasBell } from '@/features/alertas/components/AlertasBell'

interface RouteHandle {
  title?: string
}

interface HeaderProps {
  onAbrirMenu: () => void
}

export function Header({ onAbrirMenu }: HeaderProps) {
  const matches = useMatches()
  // Recorre los matches del más profundo al más superficial: la primera
  // ruta con `handle.title` es la más específica para la URL actual (una
  // tab sin handle propio hereda el título de su página contenedora).
  const match = [...matches]
    .reverse()
    .find((match) => (match.handle as RouteHandle | undefined)?.title)
  const titulo = (match?.handle as RouteHandle | undefined)?.title

  return (
    <header className="bg-fondotabla border-subtle flex h-24 shrink-0 items-center justify-between border-b px-6 ">
      <span className="text-subtitulo font-bold">{titulo}</span>
      <AlertasBell />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onAbrirMenu}
          aria-label="Abrir menú"
          className="text-content hover:bg-surface-muted -ml-2 rounded-lg p-2 md:hidden"
        >
          <Menu size={22} />
        </button>
        <span className="text-subtitulo font-bold">{titulo}</span>
      </div>
    </header>
  )
}
