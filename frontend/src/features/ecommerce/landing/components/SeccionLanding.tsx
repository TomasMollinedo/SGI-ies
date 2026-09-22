import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'
import type { IdSeccion } from '@/features/ecommerce/types/sitioPublico.types'

interface SeccionLandingProps {
  id: IdSeccion
  etiqueta: string
  titulo: string
  descripcion?: string
  className?: string
  children: ReactNode
}

/**
 * Anatomía común de las secciones de la landing: etiqueta chica monoespaciada,
 * título y contenido, dentro del mismo contenedor centrado.
 *
 * `scroll-mt-20` reserva la altura del header sticky, para que al llegar desde
 * el menú el título no quede debajo de él.
 */
export function SeccionLanding({
  id,
  etiqueta,
  titulo,
  descripcion,
  className,
  children,
}: SeccionLandingProps) {
  const idTitulo = `titulo-${id}`

  return (
    <section
      id={id}
      aria-labelledby={idTitulo}
      className={cn('border-light/10 scroll-mt-20 border-t', className)}
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <p className="text-secondary font-mono text-xs tracking-widest uppercase">{etiqueta}</p>
        <h2 id={idTitulo} className="text-seccion text-light mt-4 max-w-3xl">
          {titulo}
        </h2>
        {descripcion && <p className="text-light/70 mt-4 max-w-2xl text-base">{descripcion}</p>}
        <div className="mt-10 md:mt-14">{children}</div>
      </div>
    </section>
  )
}
