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

/** DEBE = comprobante cuyo tipo aumenta el saldo (factura); HABER = lo disminuye (nota de crédito). */
export type EfectoSaldo = 'DEBE' | 'HABER'

/**
 * Un comprobante imputable del proveedor elegido (con saldo pendiente > 0),
 * tal como lo necesita el formulario de emisión de un pago (GET
 * /pagos/comprobantes-imputables). `dias_vencido` es 0 cuando el comprobante
 * todavía no venció.
 */
export interface ComprobanteImputable {
  id_comprobante_proveedor: number
  FK_tipo_comprobante: number
  tipo_comprobante_nombre: string
  efecto_saldo: EfectoSaldo
  letra: string
  punto_de_venta: number
  numero: number
  fecha_emision: string
  fecha_vencimiento: string
  importe_total: number
  saldo_pendiente: number
  vencido: boolean
  dias_vencido: number
}

/** Respuesta de GET /pagos/comprobantes-imputables. Sin paginar: el formulario necesita verlos todos. */
export interface ComprobantesImputablesResponse {
  data: ComprobanteImputable[]
}

/** Una línea del detalle a enviar: cuánto de este pago se imputa a un comprobante puntual. */
export interface LineaImputacionPayload {
  FK_comprobante_proveedor: number
  importe_imputado: number
}

/** Body de PATCH /pagos/:id/anular. */
export interface AnularPagoPayload {
  motivo_anulacion: string
}

/** Body de POST /pagos. El pago nace siempre CONFIRMADA: no hay borrador. */
export interface CrearPagoPayload {
  FK_proveedor: number
  FK_forma_pago: number
  fecha_pago?: string
  numero_referencia?: string
  observaciones?: string
  detalle: LineaImputacionPayload[]
}

/** Datos identificatorios del comprobante imputado en una línea del detalle del pago. */
export interface ComprobanteResumenPago {
  id_comprobante_proveedor: number
  FK_tipo_comprobante: number
  letra: string
  punto_de_venta: number
  numero: number
}

/**
 * Una línea de imputación tal como quedó registrada. `saldo_anterior` y
 * `saldo_posterior` son la foto del saldo al momento de confirmar el pago:
 * no se recalculan al consultarlas.
 */
export interface LineaPago {
  id_detalle_pago: number
  FK_comprobante_proveedor: number
  importe_imputado: number
  saldo_anterior: number
  saldo_posterior: number
  comprobante: ComprobanteResumenPago
}

/** Nombre y apellido de quien creó o modificó un registro. */
export interface UsuarioResumen {
  nombre: string
  apellido: string
}

/** Respuesta de POST /pagos y GET /pagos/:id: cabecera completa + el detalle de imputaciones. */
export interface PagoDetalle {
  id_pago: number
  fecha_pago: string
  numero_referencia: string | null
  importe_total: number
  observaciones: string | null
  estado: EstadoPago
  motivo_anulacion: string | null
  banco_utilizado: string | null
  titular_utilizado: string | null
  cbu_utilizado: string | null
  alias_utilizado: string | null
  hora_creacion: string
  hora_actualizacion: string | null
  FK_proveedor: number
  FK_forma_pago: number
  FK_usuario_creador: number
  FK_usuario_actualizador: number
  proveedor: ProveedorResumen
  formaPago: FormaPagoResumen
  detalle: LineaPago[]
  usuarioCreador: UsuarioResumen
  usuarioActualizador: UsuarioResumen
}
