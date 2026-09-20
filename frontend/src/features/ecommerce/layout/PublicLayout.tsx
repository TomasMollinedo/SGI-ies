import { Outlet } from 'react-router'
import { PublicFooter } from './components/PublicFooter'
import { PublicHeader } from './components/PublicHeader'

/**
 * Estructura visual del sitio público (T100): header fijo + contenido +
 * footer, sin sidebar — análogo a MainLayout (staff) pero para las rutas
 * públicas/de cliente.
 */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}
