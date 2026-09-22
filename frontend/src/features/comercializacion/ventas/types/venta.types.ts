import type {
  Periodicidad,
  TipoPlanPago,
} from '@/features/comercializacion/planes-pago/types/planPago.types'

export type EstadoVenta = 'VIGENTE' | 'CANCELADA'

export type EstadoCuota = 'PENDIENTE' | 'PARCIAL' | 'PAGADA' | 'ANULADA'

/** Los cuatro datos del cliente al vender presencial: todos obligatorios (a diferencia de CLIENTE). */
export interface ClienteVenta {
  nombre: string
  apellido?: string
  dni_cuil: string
  email: string
  telefono: string
}

/** Cliente ya cargado, tal como lo devuelven GET /ventas/buscar-cliente y el listado/detalle de venta. */
export interface ClienteResumen {
  id_cliente: number
  nombre: string
  apellido: string | null
  dni_cuil: string | null
  email: string
  telefono: string | null
}

export interface BuscarClienteQuery {
  dni_cuil?: string
  email?: string
}

/** Respuesta de GET /ventas/buscar-cliente. No encontrarlo no es un error. */
export interface ClienteBuscado {
  encontrado: boolean
  cliente: ClienteResumen | null
}

export interface CrearVentaPayload {
  cliente: ClienteVenta
  FK_publicacion: number
  FK_plan_pago: number
}

export interface CancelarVentaPayload {
  motivo_cancelacion: string
}

export interface QueryVenta {
  FK_cliente?: number
  FK_publicacion?: number
  estado?: EstadoVenta
  page?: number
  limit?: number
}

/** Cabecera de una venta (GET /ventas y GET /ventas/:id). Los importes ya vienen como `number`. */
export interface VentaListItem {
  id_venta: number
  fecha_adhesion: string
  precio_congelado: number
  anticipo_congelado: number
  tipo_plan_congelado: TipoPlanPago
  cantidad_cuotas_congelada: number
  periodicidad_congelada: Periodicidad | null
  estado: EstadoVenta
  motivo_cancelacion: string | null
  fecha_cancelacion: string | null
  cliente: ClienteResumen
  FK_publicacion: number
  FK_plan_pago: number
}

export interface CuotaVenta {
  numero: number
  importe: number
  fecha_vencimiento: string
  saldo_pendiente: number
  estado: EstadoCuota
}

/** GET /ventas/:id — la cabecera más el cronograma completo y quién la registró. */
export interface VentaDetalle extends VentaListItem {
  usuarioCreador: { nombre: string; apellido: string }
  cuotas: CuotaVenta[]
}
