/**
 * Contratos del `/planes-pago` del Sprint 3.
 *
 * LEGACY: el backend ya eliminó ese endpoint (lo reemplaza `/planes-ejemplo`,
 * ver `planEjemplo.types.ts`). Esto queda solo porque la feature de ventas
 * todavía lee el plan de la venta con esta forma; sale cuando T138 la adapte.
 */
import type { FiltroEstadoPlan } from './planEjemplo.types'

export type TipoPlanPago = 'CONTADO' | 'FINANCIADO'

export type Periodicidad = 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL'

/** Un plan del Sprint 3. Los importes llegan como `string` (son `Decimal` en el backend). */
export interface PlanPago {
  id_plan_pago: number
  FK_publicacion: number
  nombre: string
  tipo: TipoPlanPago
  precio: string
  porcentaje_ganancia: string
  margen: string
  anticipo_porcentaje: string | null
  anticipo_monto: string | null
  cantidad_cuotas: number | null
  periodicidad: Periodicidad | null
  estado: boolean
  hora_creacion: string
  hora_actualizacion: string | null
  FK_usuario_creador: number
  FK_usuario_actualizador: number
}

export interface PlanesPagoQuery {
  FK_publicacion: number
  estado?: FiltroEstadoPlan
}
