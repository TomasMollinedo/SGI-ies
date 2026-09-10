import type { PaginatedResponse } from '@/shared/types/api.types'

/** Condición del saldo de un proveedor, tal como la filtra el backend. */
export type CondicionSaldo = 'DEUDOR' | 'A_FAVOR' | 'SIN_SALDO'

/**
 * Fila del listado (GET /cuentas-corrientes). `saldo` positivo es deuda de la
 * empresa hacia el proveedor; negativo es crédito a favor de la empresa.
 */
export interface CuentaCorrienteProveedor {
  id_proveedor: number
  razon_social: string
  cuit: string
  estado: boolean
  saldo: number
  cantidad_comprobantes_pendientes: number
  vencimiento_mas_antiguo: string | null
}

/**
 * El resumen de la card. Es estable frente a `condicionSaldo`: solo cambia si
 * cambian `FKProveedor` o `estado`.
 */
export interface ResumenCuentasCorrientes {
  deudores: number
  a_favor: number
  sin_saldo: number
  saldo_total: number
}

/** Respuesta de GET /cuentas-corrientes: la tabla (`data`/`meta`) y la card (`resumen`), en una sola llamada. */
export interface CuentasCorrientesResponse extends PaginatedResponse<CuentaCorrienteProveedor> {
  resumen: ResumenCuentasCorrientes
}

/**
 * Query params de GET /cuentas-corrientes. Sin `estado` trae activos y dados de
 * baja —a diferencia del resto del proyecto—, porque un proveedor de baja puede
 * seguir con saldo pendiente.
 */
export interface CuentasCorrientesQuery {
  FKProveedor?: number
  condicionSaldo?: CondicionSaldo
  estado?: boolean
  page?: number
  limit?: number
}
