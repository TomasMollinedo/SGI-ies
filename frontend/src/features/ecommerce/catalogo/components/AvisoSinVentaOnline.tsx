import { Building2 } from 'lucide-react'
import { Link } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { SIN_VENTA_ONLINE } from '../config/catalogo.config'

const CLASES_ENLACE =
  'text-secondary focus-visible:outline-light rounded font-medium underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-4'

/**
 * Deja claro que el ecommerce no vende —la compra es presencial— e invita a
 * contactarse con la empresa. Va en toda unidad, tenga o no plan de financiación.
 */
export function AvisoSinVentaOnline() {
  return (
    <aside
      aria-labelledby="titulo-sin-venta"
      className="border-secondary/40 bg-dark-deep flex gap-4 border p-5"
    >
      <Building2 size={20} aria-hidden="true" className="text-secondary mt-0.5 shrink-0" />
      <div className="flex flex-col gap-2 text-sm">
        <h2 id="titulo-sin-venta" className="text-light font-bold">
          {SIN_VENTA_ONLINE.titulo}
        </h2>
        <p className="text-light/70">{SIN_VENTA_ONLINE.texto}</p>
        <p className="text-light/70">{SIN_VENTA_ONLINE.invitacion}</p>
        <p className="mt-1">
          <Link to={{ pathname: PATHS.HOME, hash: '#consultanos' }} className={CLASES_ENLACE}>
            {SIN_VENTA_ONLINE.irAContacto}
          </Link>
        </p>
      </div>
    </aside>
  )
}
