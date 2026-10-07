import type { PlanEjemplo } from '@/features/ecommerce/types/catalogoPublico.types'
import { formatearPorcentaje } from '@/features/ecommerce/utils/formatearPorcentaje'
import { formatearImporte } from '@/shared/utils/importe'
import { PLANES } from '../config/catalogo.config'

interface PlanesPagoUnidadProps {
  planes: PlanEjemplo[]
}

/**
 * Los planes de ejemplo de la unidad, de solo lectura: el backend ya los
 * calculó con el precio de lista y la TNA de su plazo, el catálogo público
 * los muestra pero no opera sobre ellos.
 */
export function PlanesPagoUnidad({ planes }: PlanesPagoUnidadProps) {
  if (planes.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-light text-subtitulo font-bold">{PLANES.ejemplosTitulo}</h3>

      <ul className="grid gap-4 sm:grid-cols-2">
        {planes.map((plan) => (
          <li key={plan.nombre} className="border-light/15 bg-dark-deep flex flex-col border">
            <span aria-hidden="true" className="bg-secondary h-0.5 w-full" />
            <div className="flex flex-1 flex-col gap-4 p-5">
              <div>
                <h4 className="text-light text-subtitulo font-bold">{plan.nombre}</h4>
                <p className="text-light/60 mt-1 font-mono text-xs tracking-widest uppercase">
                  {PLANES.cuotas(plan.cantidad_cuotas)} · {PLANES.tna}{' '}
                  {formatearPorcentaje(plan.tasa_nominal_anual)}
                </p>
              </div>

              <p className="text-secondary text-lg font-bold">
                {formatearImporte(plan.valor_cuota)}
                <span className="text-light/60 ml-2 font-mono text-xs font-normal tracking-widest uppercase">
                  {PLANES.valorCuota}
                </span>
              </p>

              <dl className="border-light/10 mt-auto flex flex-col border-t text-sm">
                <Fila
                  etiqueta={PLANES.anticipo}
                  valor={`${formatearPorcentaje(plan.anticipo_porcentaje)} · ${formatearImporte(plan.anticipo_monto)}`}
                />
                <Fila
                  etiqueta={PLANES.saldoFinanciado}
                  valor={formatearImporte(plan.saldo_financiado)}
                />
                <Fila
                  etiqueta={PLANES.totalIntereses}
                  valor={formatearImporte(plan.total_intereses)}
                />
                <Fila
                  etiqueta={PLANES.totalAPagar}
                  valor={formatearImporte(plan.total_a_pagar)}
                  destacada
                />
              </dl>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Fila({
  etiqueta,
  valor,
  destacada = false,
}: {
  etiqueta: string
  valor: string
  destacada?: boolean
}) {
  return (
    <div className="border-light/10 flex items-baseline justify-between gap-4 border-b py-2.5">
      <dt className="text-light/60">{etiqueta}</dt>
      <dd className={destacada ? 'text-light font-bold' : 'text-light'}>{valor}</dd>
    </div>
  )
}
