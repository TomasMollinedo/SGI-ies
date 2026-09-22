import { useMemo, useState } from 'react'
import { Menu } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import logo from '@/assets/logo.svg'
import { PATHS } from '@/app/router/paths'
import { EMPRESA, HEADER, NAVEGACION } from '@/features/ecommerce/config/sitioPublico.config'
import { useProyectosDestacados } from '@/features/ecommerce/hooks/useProyectosDestacados'
import { useSeccionActiva } from '@/features/ecommerce/hooks/useSeccionActiva'
import type { IdSeccion } from '@/features/ecommerce/types/sitioPublico.types'
import { scrollAlInicio } from '@/features/ecommerce/utils/scrollASeccion'
import { ClienteSesionMenu } from './ClienteSesionMenu'
import { SitioPublicoMenuMobile } from './SitioPublicoMenuMobile'
import { SitioPublicoNavLinks } from './SitioPublicoNavLinks'

/**
 * Header del sitio público (landing, perfil y datos del cliente): acompaña todo
 * el scroll con fondo sólido, por encima del contenido, y una línea terracota a
 * todo el ancho.
 *
 * Es autónomo a propósito: resuelve solo qué ítems mostrar y cuál está activo,
 * para verse idéntico en todas las pantallas sin que cada una tenga que
 * pasarle nada. La zona de usuario es el `ClienteSesionMenu` de siempre.
 */
export function SitioPublicoHeader() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const { pathname } = useLocation()
  const enLanding = pathname === PATHS.HOME

  // Mismo criterio que la landing: sin destacados no hay sección Obras, así que
  // tampoco su ítem. La query es la misma (misma clave), no es un pedido extra.
  const { data, isLoading, isError } = useProyectosDestacados()
  const hayObras = isLoading || (!isError && (data?.data.length ?? 0) > 0)

  const seccionesVisibles = useMemo<IdSeccion[]>(
    () => NAVEGACION.map((item) => item.id).filter((id) => id !== 'obras' || hayObras),
    [hayObras]
  )

  // Fuera de la landing no hay ninguna sección a la vista: los ítems apuntan a
  // otra página, así que ninguno se marca como activo.
  const seccionActiva = useSeccionActiva(enLanding ? seccionesVisibles : SIN_SECCIONES)
  const cerrarMenu = () => setMenuAbierto(false)

  return (
    <header className="bg-dark border-primary sticky top-0 z-30 border-b">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to={PATHS.HOME}
          aria-label={HEADER.volverAlInicio}
          onClick={(evento) => {
            cerrarMenu()
            // Ya estando en la landing no hay a dónde navegar: solo subir.
            if (!enLanding) return

            evento.preventDefault()
            scrollAlInicio()
          }}
          className="focus-visible:outline-light flex shrink-0 items-center rounded focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <img src={logo} alt={EMPRESA.altLogo} className="h-14 w-auto sm:h-16" />
        </Link>

        <div className="hidden items-center gap-6 lg:flex">
          <SitioPublicoNavLinks
            seccionActiva={seccionActiva}
            seccionesVisibles={seccionesVisibles}
            onNavegar={cerrarMenu}
          />
          <ClienteSesionMenu
            onNavegar={cerrarMenu}
            variante="landing"
            etiquetaLogin={HEADER.iniciarSesion}
          />
        </div>

        <button
          type="button"
          onClick={() => setMenuAbierto(true)}
          aria-label={HEADER.abrirMenu}
          aria-expanded={menuAbierto}
          aria-controls="menu-sitio-publico"
          className="text-light hover:text-secondary focus-visible:outline-light -mr-2.5 rounded p-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:hidden"
        >
          <Menu size={24} aria-hidden="true" />
        </button>
      </div>

      <SitioPublicoMenuMobile
        abierto={menuAbierto}
        onCerrar={cerrarMenu}
        seccionActiva={seccionActiva}
        seccionesVisibles={seccionesVisibles}
      />
    </header>
  )
}

/** Referencia estable: es la dependencia del observer de `useSeccionActiva`. */
const SIN_SECCIONES: IdSeccion[] = []
