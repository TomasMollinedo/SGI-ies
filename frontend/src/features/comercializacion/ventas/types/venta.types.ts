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

/**
 * Las condiciones del plan que se está acordando (HU-27), compartidas por
 * `POST /ventas/simular` y `POST /ventas`: CONTADO no lleva nada más;
 * FINANCIADO lleva el plazo y el anticipo en monto O en porcentaje (uno
 * solo, el backend calcula el otro).
 */
export interface CondicionesVenta {
  FK_publicacion: number
  modalidad: TipoPlanPago
  anticipo_monto?: number | null
  anticipo_porcentaje?: number | null
  FK_plazo_financiacion?: number | null
}

export type SimularVentaPayload = CondicionesVenta

/**
 * Confirmación de la venta: las condiciones, el cliente y lo que se le
 * mostró al simular (precio de lista y TNA vigentes en ese momento) — si
 * alguno cambió, el backend rechaza la venta con un 409 y la simulación
 * recalculada.
 */
export interface CrearVentaPayload extends CondicionesVenta {
  cliente: ClienteVenta
  simulacion: {
    precio_lista: number
    tasa_nominal_anual: number | null
  }
}

/** El plazo elegido en una simulación, con la TNA vigente en ese momento. */
export interface PlazoSimulado {
  id_plazo_financiacion: number
  codigo: string
  cantidad_cuotas: number
  /** Decimal del backend: viaja como string. */
  tasa_nominal_anual: string
}

/** Una cuota del cronograma simulado. Los importes son `string` (ver `SimulacionVenta`). */
export interface CuotaSimulada {
  /** 0 = anticipo, o el 100 % del precio en CONTADO. */
  numero: number
  fecha_vencimiento: string
  importe_capital: string
  importe_interes: string
  importe: string
  saldo_capital: string
}

/**
 * Resultado de `POST /ventas/simular` (HU-27): nada se guarda. Los importes y
 * porcentajes viajan como `string` (a diferencia del resto de la feature) para
 * no perder precisión ni redondear por su cuenta — se convierten a número
 * recién al mostrarlos. En CONTADO, `plazo`, `tasa_mensual` y `valor_cuota`
 * vienen en `null` y el cronograma tiene una única cuota (la 0).
 */
export interface SimulacionVenta {
  FK_publicacion: number
  modalidad: TipoPlanPago
  /** Fecha de la venta si se confirmara hoy. */
  fecha_venta: string
  precio_lista: string
  anticipo_monto: string
  anticipo_porcentaje: string
  saldo_financiado: string
  plazo: PlazoSimulado | null
  tasa_mensual: string | null
  valor_cuota: string | null
  total_intereses: string
  total_a_pagar: string
  cuotas: CuotaSimulada[]
}

/**
 * Un plan de ejemplo de la publicación (HU-22), solo para precargar el
 * simulador de la venta — acá no se gestionan ni se calculan sus importes.
 */
export interface PlanEjemploResumen {
  id_plan_ejemplo: number
  nombre: string
  /** Decimal del backend: viaja como string. */
  anticipo_porcentaje: string
  plazo: PlazoSimulado
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
