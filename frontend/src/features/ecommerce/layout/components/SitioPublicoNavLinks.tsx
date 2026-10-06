import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { NAVEGACION, NAVEGACION_CATALOGO } from '@/features/ecommerce/config/sitioPublico.config'
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
 * Menú del sitio público. Las secciones apuntan siempre a la landing
 * (`/#seccion`), así funcionan igual desde cualquier pantalla: estando en la
 * landing se intercepta el click para desplazar suavemente, y desde otra
 * página navega a la landing, que al montar va sola hasta el ancla.
 *
 * "Catálogo" es distinto: es una ruta propia, no una sección. Va al final,
 * después de "Consultanos", y se marca activo en el catálogo y en el detalle
 * de una unidad.
 */
export function SitioPublicoNavLinks({
  seccionActiva,
  seccionesVisibles,
  onNavegar,
}: SitioPublicoNavLinksProps) {
  const { pathname } = useLocation()
  const enLanding = pathname === PATHS.HOME
  const enCatalogo =
    pathname === PATHS.ECOMMERCE.CATALOGO.ROOT ||
    pathname.startsWith(`${PATHS.ECOMMERCE.CATALOGO.ROOT}/`)

  const items = NAVEGACION.filter((item) => seccionesVisibles.includes(item.id))
  const posicionCatalogo = posicionDespuesDe(items, NAVEGACION_CATALOGO.despuesDe)

  const enlacesSecciones = items.map((item) => {
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
        className={claseEnlace(esActivo)}
      >
        {item.label}
        <SubrayadoActivo visible={esActivo} />
      </Link>
    )
  })

  const enlaceCatalogo = (
    <Link
      key="catalogo"
      to={PATHS.ECOMMERCE.CATALOGO.ROOT}
      aria-current={enCatalogo ? 'page' : undefined}
      onClick={onNavegar}
      className={claseEnlace(enCatalogo)}
    >
      {NAVEGACION_CATALOGO.label}
      <SubrayadoActivo visible={enCatalogo} />
    </Link>
  )

  const enlaces: ReactNode[] = [
    ...enlacesSecciones.slice(0, posicionCatalogo),
    enlaceCatalogo,
    ...enlacesSecciones.slice(posicionCatalogo),
  ]

  return (
    <nav aria-label="Secciones" className="flex flex-col lg:flex-row lg:items-center lg:gap-2">
      {enlaces}
    </nav>
  )
}

function claseEnlace(esActivo: boolean): string {
  return cn(
    // py-3 en el panel deja el área táctil en ~45px (mínimo recomendado: 44).
    'relative px-3 py-3 font-mono text-xs tracking-widest uppercase transition-colors lg:py-4',
    'focus-visible:outline-light focus-visible:outline-2 focus-visible:outline-offset-2',
    esActivo ? 'text-secondary' : 'text-light hover:text-secondary'
  )
}

/**
 * Subrayado dorado del ítem activo: absoluto para que aparecer y desaparecer
 * no mueva el resto del menú.
 */
function SubrayadoActivo({ visible }: { visible: boolean }) {
  if (!visible) return null

  return (
    <span
      aria-hidden="true"
      className="bg-secondary absolute inset-x-3 bottom-1.5 h-px lg:bottom-2.5"
    />
  )
}

/**
 * Índice en `items` donde insertar un ítem que va detrás de `seccion`. Si esa
 * sección no está visible, va donde habría ido: antes de la primera visible
 * que en `NAVEGACION` le sigue (o al final, si no hay ninguna).
 */
function posicionDespuesDe(items: readonly { id: IdSeccion }[], seccion: IdSeccion): number {
  const ordenSeccion = NAVEGACION.findIndex((item) => item.id === seccion)
  const siguiente = items.findIndex(
    (item) => NAVEGACION.findIndex((nav) => nav.id === item.id) > ordenSeccion
  )
  return siguiente === -1 ? items.length : siguiente
}
