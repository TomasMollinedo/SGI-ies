import type { TipoPlanPago } from '@/features/comercializacion/planes-pago/types/planPago.types'
import type {
  ProyectoPublicacion,
  UnidadResumen,
} from '@/features/comercializacion/publicaciones/types/publicacion.types'

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

/** GET /ventas/buscar-clientes: búsqueda por texto libre (nombre/apellido/DNI/email), paginada. */
export interface QueryBuscarClientes {
  busqueda: string
  page?: number
  limit?: number
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
  FK_proyecto?: number
  modalidad?: TipoPlanPago
  estado?: EstadoVenta
  /** ISO 8601. Filtran `fecha_venta`. */
  fechaDesde?: string
  fechaHasta?: string
  page?: number
  limit?: number
}

/**
 * El plan de pago acordado en la venta (HU-27): lo que quedó congelado al
 * confirmarla. En CONTADO no hay plazo, cuotas, tasa ni valor de cuota
 * (vienen en `null`), el anticipo es el precio completo y el saldo
 * financiado es 0.
 */
export interface PlanVenta {
  modalidad: TipoPlanPago
  precio: number
  anticipo: number
  saldo_financiado: number
  plazo: { id_plazo_financiacion: number; codigo: string } | null
  cantidad_cuotas: number | null
  /** Porcentaje (24 = 24 %). */
  tasa_nominal_anual: number | null
  valor_cuota: number | null
  total_intereses: number
  total_a_pagar: number
}

/** Cabecera de una venta (GET /ventas y GET /ventas/:id). Los importes ya vienen como `number`. */
export interface VentaListItem {
  id_venta: number
  fecha_venta: string
  estado: EstadoVenta
  motivo_cancelacion: string | null
  fecha_cancelacion: string | null
  cliente: ClienteResumen
  FK_publicacion: number
  unidad: UnidadResumen
  proyecto: ProyectoPublicacion
  plan: PlanVenta
  /** Suma del saldo pendiente de sus cuotas; 0 en una venta cancelada. */
  saldo_pendiente: number
}

/** Una cuota del cronograma, con el desglose del sistema francés: `importe` = `importe_capital` + `importe_interes`. */
export interface CuotaVenta {
  id_cuota: number
  numero: number
  fecha_vencimiento: string
  importe_capital: number
  importe_interes: number
  importe: number
  saldo_capital: number
  saldo_pendiente: number
  estado: EstadoCuota
}

/** GET /ventas/:id — la cabecera más el cronograma completo y quién la registró. */
export interface VentaDetalle extends VentaListItem {
  usuarioCreador: { nombre: string; apellido: string }
  cuotas: CuotaVenta[]
}
