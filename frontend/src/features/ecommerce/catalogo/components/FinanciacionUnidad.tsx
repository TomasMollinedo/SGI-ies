import type { UnidadCatalogoDetalle } from '@/features/ecommerce/types/catalogoPublico.types'
import { PLANES } from '../config/catalogo.config'
import { PlanesPagoUnidad } from './PlanesPagoUnidad'
import { SimuladorPlan } from './SimuladorPlan'

interface FinanciacionUnidadProps {
  unidad: Pick<
    UnidadCatalogoDetalle,
    'id_unidad_funcional' | 'precio_desde' | 'planes' | 'simulador'
  >
}

/**
 * Planes de ejemplo y simulador de la unidad. Sin plazos activos
 * (`simulador === null`) no hay con qué calcular nada: la sección no se
 * muestra y la unidad queda solo con su precio de contado.
 */
export function FinanciacionUnidad({ unidad }: FinanciacionUnidadProps) {
  if (unidad.simulador === null) return null

  return (
    <section aria-labelledby="titulo-financiacion" className="flex flex-col gap-8">
      <div>
        <h2 id="titulo-financiacion" className="text-light text-titulo-modal font-bold">
          {PLANES.titulo}
        </h2>
        <p className="text-light/60 mt-2 text-sm">{PLANES.subtitulo}</p>
      </div>

      <PlanesPagoUnidad planes={unidad.planes} />

      {/* `key`: al pasar a otra unidad el simulador arranca de cero. */}
      <SimuladorPlan
        key={unidad.id_unidad_funcional}
        idUnidadFuncional={unidad.id_unidad_funcional}
        precioLista={unidad.precio_desde}
        plazos={unidad.simulador.plazos}
      />
    </section>
  )
}
