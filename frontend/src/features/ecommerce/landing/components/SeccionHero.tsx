import { PATHS } from '@/app/router/paths'
import { LinkButton } from '@/features/ecommerce/components/LinkButton'
import { cn } from '@/shared/utils/cn'
import { HERO } from '@/features/ecommerce/config/sitioPublico.config'

/**
 * Primera pantalla: texto e imagen, lado a lado, con un margen parejo arriba
 * (no pegados al header) y abajo (no forzados a ocupar el resto de la
 * ventana como antes: la sección mide lo que mide su contenido).
 *
 * Contiene el único <h1> de la página.
 */
export function SeccionHero() {
  return (
    <section
      id="inicio"
      aria-labelledby="titulo-hero"
      className="bg-dark scroll-mt-20 overflow-hidden"
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 md:gap-8 md:py-16 lg:px-8">
        <div className="flex flex-col items-start gap-8 lg:gap-10">
          <p className="border-secondary text-secondary inline-flex items-center gap-3 border px-3 py-2 font-mono text-xs tracking-widest uppercase">
            <span aria-hidden="true" className="bg-primary size-2.5 shrink-0" />
            {HERO.badge}
          </p>

          <h1 id="titulo-hero" className="text-hero">
            {HERO.titulo.map((linea) => (
              <span
                key={linea.texto}
                className={cn('block', linea.acento ? 'text-secondary' : 'text-light')}
              >
                {linea.texto}
              </span>
            ))}
          </h1>

          <LinkButton
            to={PATHS.ECOMMERCE.CATALOGO.ROOT}
            variant="secondary"
            className="font-mono tracking-widest uppercase"
          >
            {HERO.cta}
          </LinkButton>
        </div>

        <div className="flex justify-center md:justify-end">
          <img
            src={HERO.imagen}
            alt={HERO.imagenAlt}
            className="block h-auto w-full max-w-64 object-contain sm:max-w-sm md:max-h-[28rem] md:max-w-full lg:max-h-[32rem]"
          />
        </div>
      </div>
    </section>
  )
}
