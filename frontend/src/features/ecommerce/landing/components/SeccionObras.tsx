import { PATHS } from '@/app/router/paths'
import { LinkButton } from '@/features/ecommerce/components/LinkButton'
import type { ProyectoDestacado } from '@/features/ecommerce/types/catalogoPublico.types'
import { OBRAS } from '@/features/ecommerce/config/sitioPublico.config'
import { SeccionLanding } from './SeccionLanding'
import { TarjetaProyectoDestacado } from './TarjetaProyectoDestacado'
import { TarjetaProyectoSkeleton } from './TarjetaProyectoSkeleton'

interface SeccionObrasProps {
  proyectos: ProyectoDestacado[]
  cargando: boolean
}

/**
 * Proyectos destacados (T107). Quien la renderiza ya decidió que hay algo para
 * mostrar: sin datos —lista vacía o error— la sección no se monta, y por eso
 * no existe acá un estado "vacío".
 */
export function SeccionObras({ proyectos, cargando }: SeccionObrasProps) {
  return (
    <SeccionLanding
      id="obras"
      etiqueta={OBRAS.etiqueta}
      titulo={OBRAS.titulo}
      descripcion={OBRAS.subtitulo}
    >
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cargando
          ? CLAVES_SKELETON.map((clave) => (
              <li key={clave}>
                <TarjetaProyectoSkeleton />
              </li>
            ))
          : proyectos.map((proyecto) => (
              <li key={proyecto.id_proyecto} className="flex">
                <TarjetaProyectoDestacado proyecto={proyecto} />
              </li>
            ))}
      </ul>

      <div className="mt-12 flex justify-center">
        <LinkButton
          to={PATHS.ECOMMERCE.CATALOGO.ROOT}
          variant="secondary"
          className="font-mono tracking-widest uppercase"
        >
          {OBRAS.cta}
        </LinkButton>
      </div>
    </SeccionLanding>
  )
}

/** El endpoint devuelve hasta 4 proyectos: se dibujan 3, una fila completa en desktop. */
const CLAVES_SKELETON = ['uno', 'dos', 'tres']
