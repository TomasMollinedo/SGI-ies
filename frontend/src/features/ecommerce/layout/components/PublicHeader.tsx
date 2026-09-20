import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Link } from 'react-router'
import logo from '@/assets/logo.svg'
import { PATHS } from '@/app/router/paths'
import { cn } from '@/shared/utils/cn'
import { ClienteSesionMenu } from './ClienteSesionMenu'
import { PublicNavLinks } from './PublicNavLinks'

/**
 * Header fijo del sitio público. Mismo criterio visual que el Sidebar del
 * panel interno: fondo oscuro (el logo es blanco, no se ve sobre fondo claro),
 * ítems con el estilo de sus links y avatar con iniciales.
 *
 * Desde `md` el menú va en línea dentro del header; en pantallas angostas se
 * colapsa en un panel que se abre con el botón de hamburguesa (mismo patrón
 * que el sidebar interno, que en móvil es off-canvas).
 */
export function PublicHeader() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const cerrarMenu = () => setMenuAbierto(false)

  return (
    <header className="bg-dark border-subtle sticky top-0 z-20 flex h-20 items-center justify-between border-b px-4 sm:px-6">
      <Link to={PATHS.HOME} onClick={cerrarMenu} className="flex items-center">
        <img src={logo} alt="IES" className="h-16 w-auto" />
      </Link>

      <button
        type="button"
        onClick={() => setMenuAbierto((valor) => !valor)}
        aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={menuAbierto}
        aria-controls="menu-publico"
        className="text-light hover:bg-light/10 -mr-2 rounded p-2 md:hidden"
      >
        {menuAbierto ? <X size={22} /> : <Menu size={22} />}
      </button>

      <div
        id="menu-publico"
        className={cn(
          'bg-dark border-subtle absolute inset-x-0 top-full flex-col gap-3 border-b px-4 py-3 sm:px-6',
          'md:static md:flex md:flex-1 md:flex-row md:items-center md:justify-between md:border-0 md:bg-transparent md:p-0 md:pl-8',
          menuAbierto ? 'flex' : 'hidden'
        )}
      >
        <PublicNavLinks onNavegar={cerrarMenu} />
        <div className="border-subtle border-t pt-3 md:border-0 md:pt-0">
          <ClienteSesionMenu onNavegar={cerrarMenu} />
        </div>
      </div>
    </header>
  )
}
