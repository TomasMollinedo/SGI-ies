import { FilaDato } from '@/features/ecommerce/components/FilaDato'
import { TIPO_PLAN_LABEL } from '@/features/ecommerce/catalogo/config/catalogo.config'
import { formatearImporte } from '@/shared/utils/importe'
import type { MiVentaDetalle } from '../types/miVenta.types'

interface PlanDePagoResumenProps {
  plan: MiVentaDetalle['plan']
}

const FORMATO_PORCENTAJE = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Condiciones del plan tal como quedaron congeladas al momento de la compra
 * (`VENTA`, no `PLANPAGO`): si el plan se editó o inactivó después, esta
 * pantalla no se entera — es lo que el cliente aceptó cuando compró. Todos los
 * importes llegan calculados del backend; acá sólo se muestran.
 */
export function PlanDePagoResumen({ plan }: PlanDePagoResumenProps) {
  return (
    <section aria-labelledby="titulo-plan-pago" className="flex flex-col gap-6">
      <h2 id="titulo-plan-pago" className="text-light text-titulo-modal font-bold">
        Plan de pago
      </h2>

      <div className="border-light/10 flex flex-col border-t">
        <FilaDato etiqueta="Modalidad" valor={TIPO_PLAN_LABEL[plan.modalidad]} />
        <FilaDato etiqueta="Precio" valor={formatearImporte(plan.precio)} />
        <FilaDato etiqueta="Anticipo" valor={formatearImporte(plan.anticipo)} />
        {plan.cantidad_cuotas !== null && (
          <FilaDato etiqueta="Cuotas" valor={`${plan.cantidad_cuotas}`} />
        )}
        {plan.tasa_nominal_anual !== null && (
          <FilaDato
            etiqueta="Tasa nominal anual"
            valor={`${FORMATO_PORCENTAJE.format(plan.tasa_nominal_anual)} %`}
          />
        )}
        {plan.valor_cuota !== null && (
          <FilaDato etiqueta="Valor de cuota" valor={formatearImporte(plan.valor_cuota)} />
        )}
        <FilaDato etiqueta="Total de intereses" valor={formatearImporte(plan.total_intereses)} />
        <FilaDato etiqueta="Total a pagar" valor={formatearImporte(plan.total_a_pagar)} />
      </div>
    </section>
  )
}
