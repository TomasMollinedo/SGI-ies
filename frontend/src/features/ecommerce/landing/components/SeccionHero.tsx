import { PATHS } from '@/app/router/paths'
import { LinkButton } from '@/features/ecommerce/components/LinkButton'
import { cn } from '@/shared/utils/cn'
import { HERO } from '@/features/ecommerce/config/sitioPublico.config'

/**
 * Primera pantalla: texto a la izquierda e imagen apoyada en el borde inferior
 * a la derecha. Ocupa el alto de la ventana menos el header (5rem = la altura
 * `h-20` del header sticky); `svh` en vez de `vh` para que en móvil no quede
 * tapada por la barra del navegador.
 *
 * La imagen se limita a 8rem menos que la sección —no a 5rem— para que su
 * punta no llegue a rozar el borde del header sticky al hacer scroll.
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
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 md:min-h-[calc(100svh-5rem)] md:grid-cols-2 md:items-end md:gap-8 lg:px-8">
        <div className="flex flex-col items-start gap-8 pt-12 md:pb-24 lg:gap-10">
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

        {/* `self-end` + `block`: la imagen se apoya en el borde inferior de la
            sección, sin el espacio que un inline dejaría debajo. */}
        <div className="flex justify-center md:h-full md:items-end md:justify-end">
          <img
            src={HERO.imagen}
            alt={HERO.imagenAlt}
            className="block h-auto w-full max-w-64 object-contain object-bottom sm:max-w-sm md:max-h-[calc(100svh-8rem)] md:max-w-full"
          />
        </div>
      </div>
    </section>
  )
}
