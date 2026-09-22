import { Badge } from '@/shared/components/ui/Badge'
import type { SelectOption } from '@/shared/components/ui/Select'
import type { EstadoComercial } from '@/features/comercializacion/publicaciones/types/publicacion.types'
import type { FiltroEstadoPlan, Periodicidad, TipoPlanPago } from '../types/planPago.types'

export const TIPO_PLAN_LABEL: Record<TipoPlanPago, string> = {
  CONTADO: 'Contado',
  FINANCIADO: 'Financiado',
}

export const PERIODICIDAD_LABEL: Record<Periodicidad, string> = {
  MENSUAL: 'Mensual',
  BIMESTRAL: 'Bimestral',
  TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral',
  ANUAL: 'Anual',
}

export const OPCIONES_TIPO_PLAN: SelectOption[] = (
  Object.entries(TIPO_PLAN_LABEL) as [TipoPlanPago, string][]
).map(([value, label]) => ({ value, label }))

export const OPCIONES_PERIODICIDAD: SelectOption[] = (
  Object.entries(PERIODICIDAD_LABEL) as [Periodicidad, string][]
).map(([value, label]) => ({ value, label }))

/** Filtro de estado del listado. Calca los valores que acepta `QueryPlanPagoDto`. */
export const OPCIONES_ESTADO_PLAN: SelectOption[] = [
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
  { value: 'todos', label: 'Todos' },
]

export const ESTADO_PLAN_POR_DEFECTO: FiltroEstadoPlan = 'true'

export function esFiltroEstadoPlan(valor: string): valor is FiltroEstadoPlan {
  return valor === 'true' || valor === 'false' || valor === 'todos'
}

export function esPeriodicidad(valor: string): valor is Periodicidad {
  return valor in PERIODICIDAD_LABEL
}

export function esTipoPlanPago(valor: string): valor is TipoPlanPago {
  return valor in TIPO_PLAN_LABEL
}

/** Badge activo/inactivo de un plan. El color nunca es lo único que lo distingue: siempre va el texto. */
export function badgeEstadoPlan(estado: boolean) {
  return <Badge variant={estado ? 'active' : 'inactive'}>{estado ? 'Activo' : 'Inactivo'}</Badge>
}

/**
 * Una publicación con una venta encima (EN_PLAN_DE_PAGO o VENDIDA) tiene
 * congeladas las condiciones económicas de TODOS sus planes, incluso las de
 * los que no se vendieron: el cliente decidió mirando el abanico completo.
 *
 * Lo vuelve a validar el backend con un 409 (`PlanPagoService.update`); acá se
 * usa para deshabilitar los campos antes de que el usuario choque con el error.
 */
export function tieneVenta(estadoComercial: EstadoComercial): boolean {
  return estadoComercial === 'EN_PLAN_DE_PAGO' || estadoComercial === 'VENDIDA'
}

export const MOTIVO_BLOQUEO_POR_VENTA = 'No se puede editar: la publicación ya tiene una venta'

/** Un plan inactivo no es una oferta vigente: sus condiciones económicas se congelan hasta reactivarlo. */
export const MOTIVO_BLOQUEO_POR_PLAN_INACTIVO = 'No se puede editar: el plan está inactivo'

/** Por qué las condiciones estructurales no se editan nunca, ni siquiera sin venta. */
export const MOTIVO_CONDICIONES_ESTRUCTURALES =
  'Para cambiar estas condiciones, inactivá este plan y creá uno nuevo'
