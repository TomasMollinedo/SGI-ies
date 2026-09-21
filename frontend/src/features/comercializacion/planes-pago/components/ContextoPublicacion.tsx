import { badgeEstadoPublicacion } from '@/features/comercializacion/publicaciones/config/publicacion.config'
import type { PublicacionDetalle } from '@/features/comercializacion/publicaciones/types/publicacion.types'
import { formatearImporte } from '@/shared/utils/importe'
import { aNumero } from '../utils/decimal'

interface ContextoPublicacionProps {
  publicacion: PublicacionDetalle
}

/**
 * Los datos de contexto de la pantalla: qué unidad es, cuánto costó y en qué
 * estado comercial está. Todo de solo lectura — el costo se administra en
 * Proyectos y el estado comercial lo mueve el sistema solo, según los planes
 * activos que tenga la publicación.
 *
 * Es la referencia contra la que se cargan los precios de los planes, así que
 * queda arriba de todo y visible mientras se completa el formulario.
 */
export function ContextoPublicacion({ publicacion }: ContextoPublicacionProps) {
  const { unidad, proyecto } = publicacion
  const costo = aNumero(unidad.costo)

  return (
    <section
      aria-label="Unidad y estado de la publicación"
      className="bg-fondotabla border-subtle flex flex-col gap-4 rounded-lg border p-4 shadow-md sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="min-w-0">
        <h2 className="text-content text-lg font-semibold wrap-anywhere">{unidad.identificador}</h2>
        <p className="text-content-muted text-sm wrap-anywhere">
          {proyecto.codigo} · {proyecto.nombre}
        </p>
        <div className="mt-2">{badgeEstadoPublicacion(publicacion)}</div>
      </div>

      <dl className="sm:text-right">
        <dt className="text-content-muted text-xs font-medium uppercase">Costo de la unidad</dt>
        <dd className="text-content mt-1 text-2xl font-semibold wrap-anywhere">
          {costo === null ? '—' : formatearImporte(costo)}
        </dd>
        <p className="text-content-muted mt-1 text-xs">Se administra en Proyectos.</p>
      </dl>
    </section>
  )
}
