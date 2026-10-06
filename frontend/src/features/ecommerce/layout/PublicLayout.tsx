import { Outlet } from 'react-router'
import { PublicFooter } from './components/PublicFooter'
import { PublicHeader } from './components/PublicHeader'

/**
 * Estructura visual del sitio público (T100): header fijo + contenido +
 * footer, sin sidebar — análogo a MainLayout (staff) pero para las rutas
 * públicas/de cliente. El fondo y el padding del contenido son los mismos
 * que usa el panel interno (`surface-muted`, cards blancas encima).
 */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="bg-surface-muted flex flex-1 flex-col px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}
