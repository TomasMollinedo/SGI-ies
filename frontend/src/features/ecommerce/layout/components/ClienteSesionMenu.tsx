import { LogOut } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { LinkButton } from '@/features/ecommerce/components/LinkButton'
import { useClienteAuthUser } from '@/features/ecommerce/hooks/useClienteAuthUser'
import { useLogoutCliente } from '@/features/ecommerce/hooks/useLogoutCliente'
import { claseEnlaceNav } from './navClases'

interface ClienteSesionMenuProps {
  onNavegar: () => void
}

/**
 * Lado derecho del header público. Con sesión: avatar con iniciales (como el
 * UserMenu del Sidebar interno), "Mi perfil" y "Cerrar sesión". Sin sesión, el
 * acceso al login.
 */
export function ClienteSesionMenu({ onNavegar }: ClienteSesionMenuProps) {
  const { data: cliente } = useClienteAuthUser()
  const { mutate: cerrarSesion, isPending: cerrandoSesion } = useLogoutCliente()
  const navigate = useNavigate()

  if (!cliente) {
    return (
      <LinkButton to={PATHS.ECOMMERCE.LOGIN} onClick={onNavegar}>
        Iniciar sesión / Registrarme
      </LinkButton>
    )
  }

  const nombreCompleto = `${cliente.nombre} ${cliente.apellido ?? ''}`.trim()
  const iniciales = `${cliente.nombre.charAt(0)}${cliente.apellido?.charAt(0) ?? ''}`.toUpperCase()

  // Se navega antes de cerrar: si el logout limpiara la sesión estando en una
  // ruta protegida (ej. /mi-perfil), el guard redirigiría a /ingresar y
  // pisaría este destino.
  function handleCerrarSesion() {
    onNavegar()
    navigate(PATHS.HOME)
    cerrarSesion()
  }

  return (
    <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-2">
      <div className="flex items-center gap-3 px-3 py-2 md:py-0">
        <span
          aria-hidden="true"
          className="bg-primary text-primary-content flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
        >
          {iniciales}
        </span>
        <span className="text-light max-w-48 truncate text-xs font-medium md:hidden lg:inline">
          {nombreCompleto}
        </span>
      </div>

      <NavLink to={PATHS.ECOMMERCE.PERFIL} className={claseEnlaceNav} onClick={onNavegar}>
        Mi perfil
      </NavLink>

      <button
        type="button"
        onClick={handleCerrarSesion}
        disabled={cerrandoSesion}
        className="text-light hover:bg-light/10 flex items-center gap-2 rounded px-3 py-2.5 text-left text-xs disabled:opacity-60 md:py-1.5"
      >
        <LogOut size={14} className="shrink-0" />
        {cerrandoSesion ? 'Saliendo...' : 'Cerrar sesión'}
      </button>
    </div>
  )
}
