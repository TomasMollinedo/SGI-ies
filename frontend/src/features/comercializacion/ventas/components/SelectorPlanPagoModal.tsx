import { CreditCard } from 'lucide-react'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { SelectorEntidadModal } from '@/shared/components/common/SelectorEntidadModal'
import type { PaginatedResponse } from '@/shared/types/api.types'
import { formatearImporte } from '@/shared/utils/importe'
import {
  PERIODICIDAD_LABEL,
  TIPO_PLAN_LABEL,
} from '@/features/comercializacion/planes-pago/config/planPago.config'
import { usePlanesPago } from '@/features/comercializacion/planes-pago/hooks/usePlanesPago'
import type { PlanPago } from '@/features/comercializacion/planes-pago/types/planPago.types'
import {
  aNumero,
  aNumeroOCero,
  formatearPorcentaje,
} from '@/features/comercializacion/planes-pago/utils/decimal'

interface SelectorPlanPagoModalProps {
  open: boolean
  onClose: () => void
  FK_publicacion: number | null
  onSeleccionar: (plan: PlanPago) => void
}

/**
 * Tabla emergente para elegir el plan de pago de la venta (HU-27), mismo
 * molde que `SelectorUnidadDisponibleModal`. Solo trae los planes ACTIVOS de
 * la publicación (default de `GET /planes-pago`, no hace falta pedirlo).
 *
 * `GET /planes-pago` no está paginado (son pocos planes por publicación) —
 * se envuelve la respuesta en una única "página" para reusar el mismo
 * `SelectorEntidadModal` que el resto de los selectores sin duplicar su UI.
 */
export function SelectorPlanPagoModal({
  open,
  onClose,
  FK_publicacion,
  onSeleccionar,
}: SelectorPlanPagoModalProps) {
  const { data, isFetching, error, refetch } = usePlanesPago(
    open && FK_publicacion !== null ? { FK_publicacion } : null
  )

  const paginaUnica: PaginatedResponse<PlanPago> | undefined = data
    ? { data, meta: { total: data.length, page: 1, limit: Math.max(data.length, 1) } }
    : undefined

  const columnas: DataTableColumn<PlanPago>[] = [
    {
      key: 'plan',
      label: 'Plan',
      render: (p) => (
        <div className="min-w-0">
          <p className="text-content font-medium wrap-anywhere">{p.nombre}</p>
          <p className="text-content-muted text-xs">{TIPO_PLAN_LABEL[p.tipo]}</p>
        </div>
      ),
    },
    {
      key: 'precio',
      label: 'Precio',
      render: (p) => (
        <p className="text-content font-medium wrap-anywhere">
          {formatearImporte(aNumeroOCero(p.precio))}
        </p>
      ),
    },
    {
      key: 'condiciones',
      label: 'Anticipo / cuotas',
      render: (p) => (
        <div className="text-content-muted text-xs">
          <p>{textoAnticipo(p)}</p>
          {p.tipo === 'FINANCIADO' && (
            <p>
              {p.cantidad_cuotas ?? '—'} cuota{p.cantidad_cuotas === 1 ? '' : 's'}
              {p.periodicidad ? ` · ${PERIODICIDAD_LABEL[p.periodicidad]}` : ''}
            </p>
          )}
        </div>
      ),
    },
  ]

  return (
    <SelectorEntidadModal<PlanPago>
      open={open}
      onClose={onClose}
      titulo="Elegir plan de pago"
      icono={<CreditCard />}
      data={paginaUnica}
      cargando={isFetching}
      error={error}
      onReintentar={() => refetch()}
      columnas={columnas}
      obtenerId={(p) => String(p.id_plan_pago)}
      page={1}
      onPageChange={() => {}}
      onSeleccionar={onSeleccionar}
      vacioTitulo="Esta unidad no tiene planes de pago activos"
      vacioDescripcion="No se puede vender sin al menos un plan activo. Cargalo desde Publicaciones."
    />
  )
}

function textoAnticipo(plan: PlanPago): string {
  const porcentaje = aNumero(plan.anticipo_porcentaje)
  if (porcentaje !== null) {
    return plan.tipo === 'CONTADO'
      ? `${formatearPorcentaje(porcentaje)} (contado)`
      : `Anticipo ${formatearPorcentaje(porcentaje)}`
  }

  const monto = aNumero(plan.anticipo_monto)
  return monto === null ? 'Anticipo —' : `Anticipo ${formatearImporte(monto)}`
}
