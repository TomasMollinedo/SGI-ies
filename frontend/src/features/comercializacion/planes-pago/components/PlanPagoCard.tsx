import { Pencil, Power, RotateCcw } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { formatearImporte } from '@/shared/utils/importe'
import { PERIODICIDAD_LABEL, TIPO_PLAN_LABEL, badgeEstadoPlan } from '../config/planPago.config'
import type { PlanPago } from '../types/planPago.types'
import { aNumero, aNumeroOCero, formatearPorcentaje } from '../utils/decimal'

interface PlanPagoCardProps {
  plan: PlanPago
  onEditar: () => void
  onCambiarEstado: () => void
  /** Con la publicación ya vendida el precio no se edita, pero el estado sí. */
  edicionBloqueada: boolean
}

/**
 * Un plan del listado: tipo, precio, estado y las condiciones que lo definen.
 *
 * Es una tarjeta y no una fila de `DataTable` porque a 400 px las cinco o seis
 * condiciones de un plan financiado no entran en columnas sin scroll
 * horizontal; apiladas sí, y en pantallas anchas la grilla las pone de a dos.
 */
export function PlanPagoCard({
  plan,
  onEditar,
  onCambiarEstado,
  edicionBloqueada,
}: PlanPagoCardProps) {
  return (
    <article className="bg-fondotabla border-subtle flex min-w-0 flex-col gap-3 rounded-lg border p-4 shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-content text-base font-semibold wrap-anywhere">{plan.nombre}</h3>
          <p className="text-content-muted text-xs">{TIPO_PLAN_LABEL[plan.tipo]}</p>
        </div>
        {badgeEstadoPlan(plan.estado)}
      </div>

      <div>
        <p className="text-content-muted text-xs font-medium uppercase">Precio</p>
        <p className="text-content text-xl font-semibold wrap-anywhere">
          {formatearImporte(aNumeroOCero(plan.precio))}
        </p>
      </div>

      <dl className="text-content-muted grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
        <CondicionPlan etiqueta="Anticipo" valor={textoAnticipo(plan)} />
        {plan.tipo === 'FINANCIADO' && (
          <>
            <CondicionPlan
              etiqueta="Cuotas"
              valor={plan.cantidad_cuotas === null ? '—' : String(plan.cantidad_cuotas)}
            />
            <CondicionPlan
              etiqueta="Periodicidad"
              valor={plan.periodicidad === null ? '—' : PERIODICIDAD_LABEL[plan.periodicidad]}
            />
          </>
        )}
      </dl>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          size="sm"
          icon={<Pencil />}
          onClick={onEditar}
          title={
            edicionBloqueada
              ? 'Se puede abrir, pero el precio no se edita: la publicación ya tiene una venta'
              : undefined
          }
        >
          Editar
        </Button>
        <Button
          size="sm"
          variant={plan.estado ? 'error' : 'success'}
          icon={plan.estado ? <Power /> : <RotateCcw />}
          onClick={onCambiarEstado}
        >
          {plan.estado ? 'Inactivar' : 'Activar'}
        </Button>
      </div>
    </article>
  )
}

function CondicionPlan({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex min-w-0 justify-between gap-2 sm:block">
      <dt className="font-medium uppercase">{etiqueta}</dt>
      <dd className="text-content wrap-anywhere">{valor}</dd>
    </div>
  )
}

/**
 * El anticipo se guarda como el usuario lo cargó: por porcentaje o por monto,
 * nunca los dos. En un plan de contado el backend lo normaliza a 100%.
 */
function textoAnticipo(plan: PlanPago): string {
  const porcentaje = aNumero(plan.anticipo_porcentaje)
  if (porcentaje !== null) {
    return plan.tipo === 'CONTADO'
      ? `${formatearPorcentaje(porcentaje)} (contado)`
      : formatearPorcentaje(porcentaje)
  }

  const monto = aNumero(plan.anticipo_monto)
  return monto === null ? '—' : formatearImporte(monto)
}
