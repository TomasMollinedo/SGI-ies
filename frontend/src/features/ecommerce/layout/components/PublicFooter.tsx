import { Link } from 'react-router'
import { PATHS } from '@/app/router/paths'

const CLASE_ENLACE = 'hover:bg-light/10 rounded px-3 py-2 md:py-1.5'

export function PublicFooter() {
  return (
    <footer className="bg-dark text-light border-subtle border-t px-4 py-6 text-xs sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-light/60">© {new Date().getFullYear()} IES Constructora</p>
        <nav aria-label="Pie de página" className="-mx-3 flex gap-1">
          <Link to={PATHS.ECOMMERCE.CATALOGO.ROOT} className={CLASE_ENLACE}>
            Catálogo
          </Link>
          <Link to={PATHS.ECOMMERCE.LOGIN} className={CLASE_ENLACE}>
            Iniciar sesión
          </Link>
        </nav>
      </div>
    </footer>
  )
}
