import type { PaginatedResponse } from '@/shared/types/api.types'

export type EstadoPago = 'CONFIRMADA' | 'ANULADA'

export interface ProveedorResumen {
  id_proveedor: number
  razon_social: string
}

export interface FormaPagoResumen {
  id_forma_pago: number
  nombre: string
  requiere_referencia: boolean
}

/** Fila del listado (GET /pagos). El detalle de las imputaciones está en GET /pagos/:id. */
export interface Pago {
  id_pago: number
  fecha_pago: string
  numero_referencia: string | null
  importe_total: number
  estado: EstadoPago
  proveedor: ProveedorResumen
  formaPago: FormaPagoResumen
}

/**
 * Control de egresos del período: viaja embebido en la respuesta de GET /pagos
 * cuando la query trae `fechaDesde` y `fechaHasta` juntas. Ya excluye los pagos
 * anulados, sin importar qué filtro de estado se haya pedido.
 */
export interface ResumenPeriodo {
  totalEgresos: number
  subtotalesPorProveedor: { proveedor: ProveedorResumen; total: number }[]
  subtotalesPorFormaPago: { formaPago: FormaPagoResumen; total: number }[]
}

/** Respuesta de GET /pagos: el listado paginado + el resumen del período (null salvo rango completo). */
export type PagosListResponse = PaginatedResponse<Pago> & {
  resumenPeriodo: ResumenPeriodo | null
}

/**
 * Valor del filtro de estado. Sin el parámetro el backend no filtra: trae
 * confirmados y anulados.
 */
export type FiltroEstadoPago = '' | EstadoPago

/** Query params de GET /pagos. Los que van `undefined` no se envían. */
export interface PagosQuery {
  FK_proveedor?: number
  FK_forma_pago?: number
  estado?: EstadoPago
  fechaDesde?: string
  fechaHasta?: string
  page?: number
  limit?: number
}
