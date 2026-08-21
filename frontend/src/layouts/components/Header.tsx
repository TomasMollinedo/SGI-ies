import { useMatches } from 'react-router'

interface RouteHandle {
  title?: string
}

export function Header() {
  const matches = useMatches()
  // Recorre los matches del más profundo al más superficial: la primera
  // ruta con `handle.title` es la más específica para la URL actual (una
  // tab sin handle propio hereda el título de su página contenedora).
  const match = [...matches]
    .reverse()
    .find((match) => (match.handle as RouteHandle | undefined)?.title)
  const titulo = (match?.handle as RouteHandle | undefined)?.title

  return (
    <header className="bg-surface border-subtle flex h-14 shrink-0 items-center border-b px-6">
      <span className="text-content font-semibold">{titulo}</span>
    </header>
  )
}
