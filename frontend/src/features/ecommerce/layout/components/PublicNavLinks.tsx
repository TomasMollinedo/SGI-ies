import { NavLink } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { claseEnlaceNav } from './navClases'

interface PublicNavLinksProps {
  onNavegar: () => void
}

export function PublicNavLinks({ onNavegar }: PublicNavLinksProps) {
  return (
    <nav aria-label="Principal" className="flex flex-col gap-1 md:flex-row md:items-center">
      {/* `end`: sin esto "/" quedaría activo en todas las rutas. */}
      <NavLink to={PATHS.HOME} end className={claseEnlaceNav} onClick={onNavegar}>
        Inicio
      </NavLink>
      <NavLink to={PATHS.ECOMMERCE.CATALOGO.ROOT} className={claseEnlaceNav} onClick={onNavegar}>
        Catálogo
      </NavLink>
    </nav>
  )
}
