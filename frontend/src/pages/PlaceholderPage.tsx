interface PlaceholderPageProps {
  titulo: string
  historia?: string
}

/**
 * Página temporal de Sprint 0. Solo valida navegación y layout.
 * Debe reemplazarse por la pantalla real al implementar su HU.
 */
export function PlaceholderPage({ titulo, historia }: PlaceholderPageProps) {
  return (
    <section className="space-y-2">
      <h1 className="text-content text-2xl font-semibold">{titulo}</h1>
      <p className="text-content-muted text-sm">
        Pantalla pendiente de implementación.
        {historia ? ` Corresponde a ${historia}.` : ''}
      </p>
    </section>
  )
}
