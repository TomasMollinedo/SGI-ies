import { Link } from 'react-router'
import { PATHS } from '@/app/router/paths'

export function PublicFooter() {
  return (
    <footer className="bg-dark text-light border-subtle border-t px-6 py-8 text-sm">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} IES Constructora</p>
        <div className="flex gap-4">
          <Link to={PATHS.ECOMMERCE.CATALOGO.ROOT} className="hover:text-content">
            Catálogo
          </Link>
          <Link to={PATHS.ECOMMERCE.LOGIN} className="hover:text-content">
            Iniciar sesión
          </Link>
        </div>
      </div>
    </footer>
  )
}
