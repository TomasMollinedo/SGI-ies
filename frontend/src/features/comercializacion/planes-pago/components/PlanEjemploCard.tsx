import { Pencil, Power, RotateCcw } from 'lucide-react'
import { formatearTasa } from '@/features/comercializacion/plazos-financiacion/utils/tasa'
import { Button } from '@/shared/components/ui/Button'
import { badgeEstadoPlan } from '../config/planPago.config'
import type { PlanEjemplo } from '../types/planEjemplo.types'
import { aNumeroOCero, formatearPorcentaje } from '../utils/decimal'
import { DesgloseImportes } from './DesgloseImportes'

interface PlanEjemploCardProps {
  plan: PlanEjemplo
  onEditar: () => void
  onCambiarEstado: () => void
  /** Por qué no se puede editar ni inactivar, o `null` si se puede. */
  motivoBloqueo: string | null
}

/**
 * Un plan del listado: su nombre, el plazo que usa y los importes que calculó
 * el backend.
 *
 * Es una tarjeta y no una fila de `DataTable` porque a 400 px los cinco
 * importes no entran en columnas sin scroll horizontal; apilados sí, y en
 * pantallas anchas la grilla pone las tarjetas de a dos.
 */
export function PlanEjemploCard({
  plan,
  onEditar,
  onCambiarEstado,
  motivoBloqueo,
}: PlanEjemploCardProps) {
  const { plazo } = plan

  return (
    <article className="bg-fondotabla border-subtle flex min-w-0 flex-col gap-3 rounded-lg border p-4 shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-content text-base font-semibold wrap-anywhere">{plan.nombre}</h3>
          <p className="text-content-muted text-xs">
            Anticipo {formatearPorcentaje(aNumeroOCero(plan.anticipo_porcentaje))} ·{' '}
            {plazo.cantidad_cuotas} cuota{plazo.cantidad_cuotas === 1 ? '' : 's'} · TNA{' '}
            {formatearTasa(plazo.tasa_nominal_anual, 2)}
          </p>
          <p className="text-content-muted text-xs">Plazo {plazo.codigo}</p>
        </div>
        {badgeEstadoPlan(plan.estado)}
      </div>

      <DesgloseImportes importes={plan.importes} cantidadCuotas={plazo.cantidad_cuotas} />

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          size="sm"
          icon={<Pencil />}
          onClick={onEditar}
          disabled={motivoBloqueo !== null}
          title={motivoBloqueo ?? undefined}
        >
          Editar
        </Button>
        <Button
          size="sm"
          variant={plan.estado ? 'error' : 'success'}
          icon={plan.estado ? <Power /> : <RotateCcw />}
          onClick={onCambiarEstado}
          disabled={motivoBloqueo !== null}
          title={motivoBloqueo ?? undefined}
        >
          {plan.estado ? 'Inactivar' : 'Activar'}
        </Button>
      </div>
    </article>
  )
}
