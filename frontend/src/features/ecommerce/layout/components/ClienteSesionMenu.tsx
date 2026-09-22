import { useId } from 'react'
import { ChevronDown, LogOut, User } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { LinkButton } from '@/features/ecommerce/components/LinkButton'
import { useClienteAuthUser } from '@/features/ecommerce/hooks/useClienteAuthUser'
import { useLogoutCliente } from '@/features/ecommerce/hooks/useLogoutCliente'
import { useMenuDesplegable } from '@/features/ecommerce/hooks/useMenuDesplegable'
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
  /**
   * Con sesión, muestra solo el avatar y el nombre, y deja "Mi perfil" y
   * "Cerrar sesión" dentro de un desplegable. Es para el header, donde las tres
   * cosas en fila compiten con la navegación; en el panel móvil, que ya es un
   * desplegable, las opciones van a la vista.
   */
  desplegable?: boolean
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
  desplegable = false,
}: ClienteSesionMenuProps) {
  const { data: cliente } = useClienteAuthUser()
  const { mutate: cerrarSesion, isPending: cerrandoSesion } = useLogoutCliente()
  const navigate = useNavigate()
  const { abierto, alternar, cerrar, contenedorRef, botonRef, manejarBlur } = useMenuDesplegable()
  const idPanel = useId()
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

  const avatar = (
    <span
      aria-hidden="true"
      className={cn(
        'bg-primary text-primary-content flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        esLanding && 'font-mono'
      )}
    >
      {iniciales}
    </span>
  )

  // Las dos opciones se definen una sola vez y se acomodan al contenedor: en el
  // desplegable ocupan todo el ancho, y fuera de él conservan el estilo de los
  // enlaces del header. La ruta y el logout son los mismos en los dos casos.
  const enlacePerfil = (
    <NavLink
      to={PATHS.ECOMMERCE.PERFIL}
      className={({ isActive }) =>
        cn(
          esLanding ? claseEnlaceNavLanding({ isActive }) : claseEnlaceNav({ isActive }),
          desplegable && CLASE_ITEM_DESPLEGABLE
        )
      }
      onClick={() => {
        cerrar()
        onNavegar()
      }}
    >
      Mi perfil
    </NavLink>
  )

  const botonCerrarSesion = (
    <button
      type="button"
      onClick={() => {
        cerrar()
        handleCerrarSesion()
      }}
      disabled={cerrandoSesion}
      className={cn(
        'flex items-center gap-2 text-left disabled:opacity-60',
        esLanding
          ? `${CLASE_BASE_NAV_LANDING} text-light hover:text-secondary`
          : 'text-light hover:bg-light/10 rounded px-3 py-2.5 text-xs md:py-1.5',
        desplegable && CLASE_ITEM_DESPLEGABLE
      )}
    >
      <LogOut size={14} className="shrink-0" />
      {cerrandoSesion ? 'Saliendo...' : 'Cerrar sesión'}
    </button>
  )

  if (desplegable) {
    return (
      <div ref={contenedorRef} onBlur={manejarBlur} className="relative">
        {/*
          Es un "disclosure", no un menú ARIA: adentro hay un enlace y un botón
          que se recorren con Tab, como el resto del header. Por eso
          `aria-haspopup` genérico y no `role="menu"`, que obligaría a mover el
          foco con las flechas.
        */}
        <button
          ref={botonRef}
          type="button"
          onClick={alternar}
          aria-haspopup="true"
          aria-expanded={abierto}
          aria-controls={idPanel}
          className={cn(
            'text-light hover:text-secondary flex items-center gap-3 rounded px-2 py-2 transition-colors',
            'focus-visible:outline-light focus-visible:outline-2 focus-visible:outline-offset-2'
          )}
        >
          {avatar}
          {/*
            El nombre manda: se le da todo el ancho que sobra en el header y un
            interletrado más corto que el de la navegación, para que un nombre
            largo entre entero. El recorte queda solo como red de seguridad —si
            igual llega a cortarse, el panel lo muestra completo al abrirlo.
          */}
          <span className="max-w-64 truncate font-mono text-xs tracking-wide uppercase xl:max-w-80">
            {nombreCompleto}
          </span>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={cn('shrink-0 transition-transform', abierto && 'rotate-180')}
          />
        </button>

        {abierto && (
          <div
            id={idPanel}
            className="bg-dark-deep border-light/15 absolute top-full right-0 z-40 mt-2 flex w-64 flex-col border shadow-xl"
          >
            <span aria-hidden="true" className="bg-primary h-0.5 w-full" />
            {/* Acá el nombre va entero, en varias líneas si hace falta. */}
            <p className="border-light/10 text-light border-b px-4 py-3 font-mono text-xs tracking-wide break-words uppercase">
              {nombreCompleto}
            </p>
            {enlacePerfil}
            {botonCerrarSesion}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-1',
        esLanding ? 'lg:flex-row lg:items-center lg:gap-2' : 'md:flex-row md:items-center md:gap-2'
      )}
    >
      <div className={cn('flex items-center gap-3 px-3 py-2', esLanding ? 'lg:py-0' : 'md:py-0')}>
        {avatar}
        {/*
          En la landing esta presentación es la del panel desplegable, donde hay
          ancho de sobra: el nombre se muestra entero, cortando de línea si hace
          falta. En el header del resto del sitio, en cambio, comparte la fila
          con el resto del menú, así que se recorta y aparece recién desde lg.
        */}
        <span
          className={
            esLanding
              ? 'text-light font-mono text-xs tracking-wide break-words uppercase'
              : 'text-light max-w-48 truncate text-xs font-medium md:hidden lg:inline'
          }
        >
          {nombreCompleto}
        </span>
      </div>

      {enlacePerfil}
      {botonCerrarSesion}
    </div>
  )
}

/**
 * Dentro del panel las dos opciones ocupan todo el ancho. `lg:py-3` neutraliza
 * el `lg:py-1.5` que traen los enlaces del header, pensado para ir en línea.
 */
const CLASE_ITEM_DESPLEGABLE = 'hover:bg-light/5 w-full justify-start px-4 py-3 lg:py-3'
