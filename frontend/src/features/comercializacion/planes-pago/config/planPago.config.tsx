import { Badge } from '@/shared/components/ui/Badge'
import type { SelectOption } from '@/shared/components/ui/Select'
import type { EstadoComercial } from '@/features/comercializacion/publicaciones/types/publicacion.types'
import type { FiltroEstadoPlan } from '../types/planEjemplo.types'
import type { Periodicidad, TipoPlanPago } from '../types/planPago.types'

// LEGACY: las dos etiquetas de abajo las lee la feature de ventas (plan del
// Sprint 3) hasta que T138 la adapte. Un plan de ejemplo no tiene tipo ni
// periodicidad.
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

/** Filtro de estado del listado. Calca los valores que acepta `QueryPlanEjemploDto`. */
export const OPCIONES_ESTADO_PLAN: SelectOption[] = [
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
  { value: 'todos', label: 'Todos' },
]

export const ESTADO_PLAN_POR_DEFECTO: FiltroEstadoPlan = 'true'

export function esFiltroEstadoPlan(valor: string): valor is FiltroEstadoPlan {
  return valor === 'true' || valor === 'false' || valor === 'todos'
}

/** Badge activo/inactivo de un plan. El color nunca es lo único que lo distingue: siempre va el texto. */
export function badgeEstadoPlan(estado: boolean) {
  return <Badge variant={estado ? 'active' : 'inactive'}>{estado ? 'Activo' : 'Inactivo'}</Badge>
}

/**
 * Una publicación con una venta encima (EN_PLAN_DE_PAGO o VENDIDA) tiene
 * congeladas las condiciones económicas, incluido el precio de lista.
 *
 * Lo vuelve a validar el backend con un 409; acá se usa para deshabilitar los
 * campos antes de que el usuario choque con el error.
 */
export function tieneVenta(estadoComercial: EstadoComercial): boolean {
  return estadoComercial === 'EN_PLAN_DE_PAGO' || estadoComercial === 'VENDIDA'
}

export const MOTIVO_BLOQUEO_POR_VENTA = 'No se puede editar: la publicación ya tiene una venta'

/**
 * Por qué no se pueden cargar, editar ni inactivar planes de ejemplo, o `null`
 * si se puede. El backend solo lo permite con la publicación vigente y
 * Disponible (`PlanEjemploService.buscarPublicacionDisponible`): es cuando ya
 * tiene precio de lista, sin el cual no hay importes que calcular.
 */
export function motivoPlanesBloqueados(estadoComercial: EstadoComercial, vigente: boolean) {
  if (!vigente) return 'La publicación fue despublicada'
  if (estadoComercial === 'EN_PREPARACION') {
    return 'La publicación está en preparación: definí su precio de lista para poder cargar planes'
  }
  if (tieneVenta(estadoComercial)) return 'La publicación ya tiene una venta'

  return null
}
