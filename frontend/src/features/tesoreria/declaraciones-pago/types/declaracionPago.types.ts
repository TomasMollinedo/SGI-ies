import type { PaginatedResponse } from '@/shared/types/api.types'

/**
 * Contratos de `/declaraciones-pago` (bandeja de Tesorería, T117, HU-29), tal
 * como los expone el backend (`declaracion-pago-response.dto.ts`) — en
 * snake_case, sin renombrar campos.
 */

export type EstadoDeclaracionPago = 'PENDIENTE' | 'VALIDADA' | 'RECHAZADA'
export type EstadoCobroDeclaracion = 'CONFIRMADO' | 'ANULADO'

/** La declaración sola: lo que devuelven validar y rechazar. */
export interface DeclaracionPagoBase {
  id_declaracion_pago: number
  FK_cliente: number
  FK_cuota: number
  FK_forma_pago: number
  importe: number
  numero_referencia: string | null
  estado: EstadoDeclaracionPago
  motivo_rechazo: string | null
  fecha_resolucion: string | null
  FK_usuario_validador: number | null
  /** El cobro que generó al validarse. */
  FK_cobro: number | null
  hora_creacion: string
}

/**
 * Ítem de `GET /declaraciones-pago`: la declaración más todo lo necesario
 * para cotejarla sin otra consulta. `cuota.saldo_pendiente` es el saldo
 * ACTUAL, no el del momento de declarar. `cobro` solo viene en una VALIDADA;
 * si ese cobro se anuló después, la declaración sigue VALIDADA.
 */
export interface DeclaracionPago extends DeclaracionPagoBase {
  cliente: {
    id_cliente: number
    nombre: string
    apellido: string | null
    dni_cuil: string | null
    email: string
  }
  cuota: {
    id_cuota: number
    numero: number
    saldo_pendiente: number
  }
  venta: {
    id_venta: number
    unidad: { identificador: string }
    proyecto: { nombre: string }
  }
  forma_pago: { nombre: string }
  cobro: { id_cobro: number; estado: EstadoCobroDeclaracion } | null
}

/** Paginado, de la más antigua a la más reciente (es una cola de trabajo). Sin resumen. */
export type DeclaracionesPagoListResponse = PaginatedResponse<DeclaracionPago>

/**
 * Filtros de `GET /declaraciones-pago`, todos combinables. `fechaDesde` y
 * `fechaHasta` filtran por `hora_creacion` y viajan como instante ISO con
 * offset (ver `inicioDelDiaIso`/`finDelDiaIso`).
 */
export interface DeclaracionesPagoQuery {
  FK_cliente?: number
  FK_forma_pago?: number
  estado?: EstadoDeclaracionPago
  fechaDesde?: string
  fechaHasta?: string
  page: number
  limit: number
}

/** Valor del `<Select>` de estado: `''` es "todos". */
export type FiltroEstadoDeclaracion = EstadoDeclaracionPago | ''

export interface RechazarDeclaracionPayload {
  motivo_rechazo: string
}
