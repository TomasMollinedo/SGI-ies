import type { PlanPagoPublico } from '@/features/ecommerce/types/catalogoPublico.types'
import { formatearImporte } from '@/shared/utils/importe'
import { DETALLE, PERIODICIDAD_PLURAL, TIPO_PLAN_LABEL } from '../config/catalogo.config'

interface PlanesPagoUnidadProps {
  planes: PlanPagoPublico[]
}

/**
 * Los planes de pago activos de la unidad, de solo lectura: el catálogo público
 * los muestra pero no opera sobre ellos.
 */
export function PlanesPagoUnidad({ planes }: PlanesPagoUnidadProps) {
  if (planes.length === 0) return null

  return (
    <section aria-labelledby="titulo-planes" className="flex flex-col gap-6">
      <div>
        <h2 id="titulo-planes" className="text-light text-titulo-modal font-bold">
          {DETALLE.planesTitulo}
        </h2>
        <p className="text-light/60 mt-2 text-sm">{DETALLE.planesSubtitulo}</p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {planes.map((plan) => (
          <li key={plan.nombre} className="border-light/15 bg-dark-deep flex flex-col border">
            <span aria-hidden="true" className="bg-secondary h-0.5 w-full" />
            <div className="flex flex-1 flex-col gap-2 p-5">
              <p className="text-light/60 font-mono text-xs tracking-widest uppercase">
                {TIPO_PLAN_LABEL[plan.tipo]}
              </p>
              <h3 className="text-light text-subtitulo font-bold">{plan.nombre}</h3>

              <p className="text-secondary text-lg font-bold">{formatearImporte(plan.precio)}</p>

              <ul className="text-light/70 mt-auto flex flex-col gap-1 pt-2 text-sm">
                {plan.anticipo_porcentaje !== null && (
                  <li>
                    {DETALLE.anticipo}: {plan.anticipo_porcentaje}%
                  </li>
                )}
                {plan.anticipo_monto !== null && (
                  <li>
                    {DETALLE.anticipo}: {formatearImporte(plan.anticipo_monto)}
                  </li>
                )}
                {plan.cantidad_cuotas !== null && plan.periodicidad !== null && (
                  <li>
                    {DETALLE.cuotas(plan.cantidad_cuotas, PERIODICIDAD_PLURAL[plan.periodicidad])}
                  </li>
                )}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
