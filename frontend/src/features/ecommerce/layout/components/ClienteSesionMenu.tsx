import { LogOut, User } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { LinkButton } from '@/features/ecommerce/components/LinkButton'
import { useClienteAuthUser } from '@/features/ecommerce/hooks/useClienteAuthUser'
import { useLogoutCliente } from '@/features/ecommerce/hooks/useLogoutCliente'
import { cn } from '@/shared/utils/cn'
import { CLASE_BASE_NAV_LANDING, claseEnlaceNav, claseEnlaceNavLanding } from './navClases'

/**
 * `publico` es el header del resto del sitio; `landing` es el mismo menú con el
 * lenguaje visual de la landing (monoespaciada en mayúsculas, dorado) y el
 * acceso al login como ícono en vez de botón con texto.
 */
export type VarianteSesion = 'publico' | 'landing'

interface ClienteSesionMenuProps {
  onNavegar: () => void
  variante?: VarianteSesion
  /**
   * Texto accesible del acceso al login en la variante `landing`, donde el
   * enlace es solo un ícono. Lo provee quien usa el menú para que el contenido
   * siga viviendo en el archivo de constantes de esa pantalla.
   */
  etiquetaLogin?: string
}

/**
 * Lado derecho del header público. Con sesión: avatar con iniciales (como el
 * UserMenu del Sidebar interno), "Mi perfil" y "Cerrar sesión". Sin sesión, el
 * acceso al login.
 */
export function ClienteSesionMenu({
  onNavegar,
  variante = 'publico',
  etiquetaLogin,
}: ClienteSesionMenuProps) {
  const { data: cliente } = useClienteAuthUser()
  const { mutate: cerrarSesion, isPending: cerrandoSesion } = useLogoutCliente()
  const navigate = useNavigate()
  const esLanding = variante === 'landing'

  if (!cliente) {
    if (esLanding) {
      return (
        <Link
          to={PATHS.ECOMMERCE.LOGIN}
          onClick={onNavegar}
          aria-label={etiquetaLogin}
          className={cn(
            'text-light hover:border-secondary hover:text-secondary inline-flex items-center gap-3',
            'border-light/40 rounded-full border p-2.5 transition-colors',
            'focus-visible:outline-light focus-visible:outline-2 focus-visible:outline-offset-2',
            // Dentro del panel desplegable el ícono solo no alcanza: ahí el
            // enlace ocupa todo el ancho y muestra también el texto.
            'w-full justify-center lg:w-auto'
          )}
        >
          <User size={18} aria-hidden="true" className="shrink-0" />
          <span className="font-mono text-xs tracking-widest uppercase lg:hidden">
            {etiquetaLogin}
          </span>
        </Link>
      )
    }

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
    <div
      className={cn(
        'flex flex-col gap-1',
        esLanding ? 'lg:flex-row lg:items-center lg:gap-2' : 'md:flex-row md:items-center md:gap-2'
      )}
    >
      <div className={cn('flex items-center gap-3 px-3 py-2', esLanding ? 'lg:py-0' : 'md:py-0')}>
        <span
          aria-hidden="true"
          className={cn(
            'bg-primary text-primary-content flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
            esLanding && 'font-mono'
          )}
        >
          {iniciales}
        </span>
        {/*
          Dónde entra el nombre: en el header del resto del sitio, desde lg. En
          la landing, dentro del panel desplegable (hasta lg) y en el header
          recién desde xl — entre medio, las cuatro anclas más "Mi perfil" y
          "Cerrar sesión" ya ocupan todo el ancho.
        */}
        <span
          className={cn(
            'text-light max-w-48 truncate text-xs font-medium md:hidden lg:inline',
            esLanding && 'font-mono tracking-widest uppercase md:inline lg:hidden xl:inline'
          )}
        >
          {nombreCompleto}
        </span>
      </div>

      <NavLink
        to={PATHS.ECOMMERCE.PERFIL}
        className={esLanding ? claseEnlaceNavLanding : claseEnlaceNav}
        onClick={onNavegar}
      >
        Mi perfil
      </NavLink>

      <button
        type="button"
        onClick={handleCerrarSesion}
        disabled={cerrandoSesion}
        className={cn(
          'flex items-center gap-2 text-left disabled:opacity-60',
          esLanding
            ? `${CLASE_BASE_NAV_LANDING} text-light hover:text-secondary`
            : 'text-light hover:bg-light/10 rounded px-3 py-2.5 text-xs md:py-1.5'
        )}
      >
        <LogOut size={14} className="shrink-0" />
        {cerrandoSesion ? 'Saliendo...' : 'Cerrar sesión'}
      </button>
    </div>
  )
}
