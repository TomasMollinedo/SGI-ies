import { Link, useLocation } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { NAVEGACION } from '@/features/ecommerce/config/sitioPublico.config'
import type { IdSeccion } from '@/features/ecommerce/types/sitioPublico.types'
import { scrollASeccion } from '@/features/ecommerce/utils/scrollASeccion'
import { cn } from '@/shared/utils/cn'

interface SitioPublicoNavLinksProps {
  seccionActiva: IdSeccion | null
  /** Secciones que existen hoy en la landing: las que no, no se listan. */
  seccionesVisibles: readonly IdSeccion[]
  onNavegar: () => void
}

/**
 * Menú de secciones del sitio público. Cada ítem apunta siempre a la landing
 * (`/#seccion`), así funciona igual desde cualquier pantalla: estando en la
 * landing se intercepta el click para desplazar suavemente, y desde el perfil
 * navega a la landing, que al montar va sola hasta el ancla.
 */
export function SitioPublicoNavLinks({
  seccionActiva,
  seccionesVisibles,
  onNavegar,
}: SitioPublicoNavLinksProps) {
  const { pathname } = useLocation()
  const enLanding = pathname === PATHS.HOME
  const items = NAVEGACION.filter((item) => seccionesVisibles.includes(item.id))

  return (
    <nav aria-label="Secciones" className="flex flex-col lg:flex-row lg:items-center lg:gap-2">
      {items.map((item) => {
        const esActivo = item.id === seccionActiva

        return (
          <Link
            key={item.id}
            to={{ pathname: PATHS.HOME, hash: `#${item.id}` }}
            aria-current={esActivo ? 'location' : undefined}
            onClick={(evento) => {
              onNavegar()
              if (!enLanding) return

              evento.preventDefault()
              scrollASeccion(item.id)
            }}
            className={cn(
              // py-3 en el panel deja el área táctil en ~45px (mínimo recomendado: 44).
              'relative px-3 py-3 font-mono text-xs tracking-widest uppercase transition-colors lg:py-4',
              'focus-visible:outline-light focus-visible:outline-2 focus-visible:outline-offset-2',
              esActivo ? 'text-secondary' : 'text-light hover:text-secondary'
            )}
          >
            {item.label}
            {/* Subrayado dorado del ítem activo: absoluto para que aparecer y
                desaparecer no mueva el resto del menú. */}
            {esActivo && (
              <span
                aria-hidden="true"
                className="bg-secondary absolute inset-x-3 bottom-1.5 h-px lg:bottom-2.5"
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
