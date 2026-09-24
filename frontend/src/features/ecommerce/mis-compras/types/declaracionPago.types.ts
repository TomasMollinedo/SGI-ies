import type { EstadoCobro } from './miVenta.types'

/**
 * Contratos de la declaración de pago del cliente (T116/T117, HU-29), tal
 * como los expone el backend — en snake_case, sin renombrar campos.
 */

export type EstadoDeclaracionPago = 'PENDIENTE' | 'VALIDADA' | 'RECHAZADA'

/**
 * Ítem de `GET /cliente/formas-pago-autogestion` (`CatalogoItemDto`): `id` es
 * el `id_forma_pago` como string y `code` el nombre. Solo trae formas activas
 * y habilitadas para autogestión: una lista vacía significa que el cliente no
 * puede declarar pagos y tiene que pagar de forma presencial.
 */
export interface FormaPagoAutogestion {
  id: string
  code: string
  metadata: {
    requiere_referencia: boolean
  }
}

/** Body de `POST /cliente/declaraciones-pago`. */
export interface DeclararPagoPayload {
  FK_cuota: number
  FK_forma_pago: number
  importe: number
  numero_referencia?: string
}

/**
 * Ítem de `GET /cliente/ventas/:id/declaraciones-pago`. `cobro` solo viene en
 * una VALIDADA: es el cobro que generó, que ya figura en el historial de
 * pagos. Si ese cobro se anuló después, la declaración sigue VALIDADA y
 * `cobro.estado` es ANULADO.
 */
export interface DeclaracionPagoCliente {
  id_declaracion_pago: number
  estado: EstadoDeclaracionPago
  importe: number
  numero_referencia: string | null
  motivo_rechazo: string | null
  hora_creacion: string
  fecha_resolucion: string | null
  cuota: {
    id_cuota: number
    numero: number
  }
  forma_pago: {
    nombre: string
  }
  cobro: {
    id_cobro: number
    estado: EstadoCobro
  } | null
}

/** `GET /cliente/ventas/:id/declaraciones-pago`: paginado, de la más reciente a la más antigua. */
export interface DeclaracionesPagoClienteResponse {
  data: DeclaracionPagoCliente[]
  meta: {
    total: number
    page: number
    limit: number
  }
}
