import { FilaDato } from '@/features/ecommerce/components/FilaDato'
import {
  PERIODICIDAD_LABEL,
  TIPO_PLAN_LABEL,
} from '@/features/ecommerce/catalogo/config/catalogo.config'
import { formatearImporte } from '@/shared/utils/importe'
import type { MiVentaDetalle } from '../types/miVenta.types'

interface PlanDePagoResumenProps {
  plan: MiVentaDetalle['plan']
}

/**
 * Condiciones del plan tal como quedaron congeladas al momento de la compra
 * (`VENTA`, no `PLANPAGO`): si el plan se editó o inactivó después, esta
 * pantalla no se entera — es lo que el cliente aceptó cuando compró.
 */
export function PlanDePagoResumen({ plan }: PlanDePagoResumenProps) {
  return (
    <section aria-labelledby="titulo-plan-pago" className="flex flex-col gap-6">
      <h2 id="titulo-plan-pago" className="text-light text-titulo-modal font-bold">
        Plan de pago
      </h2>

      <div className="border-light/10 flex flex-col border-t">
        <FilaDato etiqueta="Plan" valor={plan.nombre} />
        <FilaDato etiqueta="Tipo" valor={TIPO_PLAN_LABEL[plan.tipo]} />
        <FilaDato etiqueta="Precio" valor={formatearImporte(plan.precio)} />
        <FilaDato etiqueta="Anticipo" valor={formatearImporte(plan.anticipo)} />
        {plan.periodicidad !== null && (
          <FilaDato
            etiqueta="Cuotas"
            valor={`${plan.cantidad_cuotas} cuotas ${PERIODICIDAD_LABEL[plan.periodicidad].toLowerCase()}`}
          />
        )}
      </div>
    </section>
  )
}
