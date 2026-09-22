import { COMO_FUNCIONA } from '@/features/ecommerce/config/sitioPublico.config'
import { SeccionLanding } from './SeccionLanding'

/**
 * Los pasos de la compra, numerados. En desktop van en fila, unidos por una
 * línea terracota fina; en móvil se apilan y la línea desaparece.
 */
export function SeccionComoFunciona() {
  return (
    <SeccionLanding
      id="como-funciona"
      etiqueta={COMO_FUNCIONA.etiqueta}
      titulo={COMO_FUNCIONA.titulo}
    >
      <ol className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {COMO_FUNCIONA.pasos.map((paso, indice) => {
          const Icono = paso.icono
          const esUltimo = indice === COMO_FUNCIONA.pasos.length - 1

          return (
            <li key={paso.titulo} className="relative flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="text-secondary font-mono text-3xl font-bold">
                  {String(indice + 1).padStart(2, '0')}
                </span>
                <Icono size={24} aria-hidden="true" className="text-primary shrink-0" />
                {/* Conector entre pasos: solo en fila, y nunca después del último. */}
                {!esUltimo && (
                  <span aria-hidden="true" className="bg-primary/50 hidden h-px flex-1 lg:block" />
                )}
              </div>

              <div>
                <h3 className="text-light text-subtitulo font-bold">{paso.titulo}</h3>
                <p className="text-light/70 mt-2 text-sm">{paso.descripcion}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </SeccionLanding>
  )
}
