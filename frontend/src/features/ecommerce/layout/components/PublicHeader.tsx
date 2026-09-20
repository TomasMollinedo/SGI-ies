import { Link, useNavigate } from 'react-router'
import logo from '@/assets/logo.svg'
import { PATHS } from '@/app/router/paths'
import { useClienteAuthUser } from '@/features/ecommerce/hooks/useClienteAuthUser'
import { useLogoutCliente } from '@/features/ecommerce/hooks/useLogoutCliente'

/**
 * Header fijo del sitio público, sin sidebar. Con sesión de cliente muestra
 * su nombre, "Mi perfil" y "Cerrar sesión"; sin sesión, el acceso al login.
 */
export function PublicHeader() {
  const { data: cliente } = useClienteAuthUser()
  const { mutate: cerrarSesion, isPending: cerrandoSesion } = useLogoutCliente()
  const navigate = useNavigate()

  // Se navega antes de cerrar: si el logout limpiara la sesión estando en una
  // ruta protegida (ej. /mi-perfil), el guard redirigiría a /ingresar y
  // pisaría este destino.
  function handleCerrarSesion() {
    navigate(PATHS.HOME)
    cerrarSesion()
  }

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
      {cliente ? (
        <div className="flex items-center gap-4">
          <span className="text-content-muted hidden text-sm sm:inline">{cliente.nombre}</span>
          <Link
            to={PATHS.ECOMMERCE.PERFIL}
            className="text-content hover:text-primary text-sm font-medium"
          >
            Mi perfil
          </Link>
          <button
            type="button"
            onClick={handleCerrarSesion}
            disabled={cerrandoSesion}
            className="text-content hover:text-primary text-sm font-medium disabled:opacity-60"
          >
            Cerrar sesión
          </button>
        </div>
      ) : (
        <Link
          to={PATHS.ECOMMERCE.LOGIN}
          className="bg-primary text-primary-content rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
        >
          Iniciar sesión / Registrarme
        </Link>
      )}
    </header>
  )
}
