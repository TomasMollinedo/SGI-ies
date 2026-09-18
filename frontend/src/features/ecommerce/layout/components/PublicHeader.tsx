import { Link } from 'react-router'
import logo from '@/assets/logo.svg'
import { PATHS } from '@/app/router/paths'

/**
 * Base de T100: header fijo, sin sidebar. Estático a propósito — mostrar
 * sesión de cliente (nombre, cerrar sesión) es parte de la implementación
 * real de T100, no de esta base.
 */
export function PublicHeader() {
  return (
    <header className="bg-fondotabla border-subtle sticky top-0 z-20 flex h-20 items-center justify-between border-b px-6">
      <Link to={PATHS.HOME} className="flex items-center gap-2">
        <img src={logo} alt="IES" className="h-12 w-auto" />
      </Link>
      <nav className="hidden items-center gap-6 md:flex">
        <Link to={PATHS.HOME} className="text-content hover:text-primary text-sm font-medium">
          Inicio
        </Link>
        <Link
          to={PATHS.ECOMMERCE.CATALOGO.ROOT}
          className="text-content hover:text-primary text-sm font-medium"
        >
          Catálogo
        </Link>
      </nav>
      <Link
        to={PATHS.ECOMMERCE.LOGIN}
        className="bg-primary text-primary-content rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
      >
        Iniciar sesión / Registrarme
      </Link>
    </header>
  )
}
