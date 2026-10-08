import { Badge } from '@/shared/components/ui/Badge'
import type { SelectOption } from '@/shared/components/ui/Select'
import { TIPO_PLAN_LABEL } from '@/features/comercializacion/planes-pago/config/planPago.config'
import type { TipoPlanPago } from '@/features/comercializacion/planes-pago/types/planPago.types'
import type { EstadoCuota, EstadoVenta } from '../types/venta.types'

export const LIMITE_PAGINA = 10

/** Para las columnas sin dato: cuotas, TNA y valor de cuota de una venta CONTADO. */
export const SIN_DATO = '—'

export type FiltroEstadoVenta = 'todos' | EstadoVenta

export const ESTADO_VENTA_POR_DEFECTO: FiltroEstadoVenta = 'todos'

export const OPCIONES_ESTADO_VENTA: SelectOption[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'VIGENTE', label: 'Vigente' },
  { value: 'CANCELADA', label: 'Cancelada' },
]

export function esFiltroEstadoVenta(valor: string): valor is FiltroEstadoVenta {
  return valor === 'todos' || valor === 'VIGENTE' || valor === 'CANCELADA'
}

export type FiltroModalidadVenta = 'todos' | TipoPlanPago

export const MODALIDAD_VENTA_POR_DEFECTO: FiltroModalidadVenta = 'todos'

export const OPCIONES_MODALIDAD_VENTA: SelectOption[] = [
  { value: 'todos', label: 'Todas' },
  ...(Object.entries(TIPO_PLAN_LABEL) as [TipoPlanPago, string][]).map(([value, label]) => ({
    value,
    label,
  })),
]

export function esFiltroModalidadVenta(valor: string): valor is FiltroModalidadVenta {
  return valor === 'todos' || valor === 'CONTADO' || valor === 'FINANCIADO'
}

/** Badge de la columna "Estado" del listado y del detalle. */
export function badgeEstadoVenta(estado: EstadoVenta) {
  return (
    <Badge variant={estado === 'VIGENTE' ? 'active' : 'inactive'}>
      {estado === 'VIGENTE' ? 'Vigente' : 'Cancelada'}
    </Badge>
  )
}

const ESTADO_CUOTA_LABEL: Record<EstadoCuota, string> = {
  PENDIENTE: 'Pendiente',
  PARCIAL: 'Parcial',
  PAGADA: 'Pagada',
  ANULADA: 'Anulada',
}

/** Badge de cada fila del cronograma de cuotas. */
export function badgeEstadoCuota(estado: EstadoCuota) {
  const variante = { PENDIENTE: 'warning', PARCIAL: 'info', PAGADA: 'active', ANULADA: 'inactive' }[
    estado
  ] as 'warning' | 'info' | 'active' | 'inactive'

  return <Badge variant={variante}>{ESTADO_CUOTA_LABEL[estado]}</Badge>
}
