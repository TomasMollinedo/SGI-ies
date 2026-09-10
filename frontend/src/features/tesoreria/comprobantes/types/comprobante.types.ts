/** Situación del documento. */
export type EstadoComprobante = 'BORRADOR' | 'REGISTRADO' | 'ANULADO'

/**
 * Estado de saldo. Solo tiene valor en comprobantes REGISTRADOS; en BORRADOR y
 * en ANULADO viaja `null`.
 */
export type EstadoSaldo = 'PENDIENTE' | 'SALDADO'

/** Una línea del detalle tal como la devuelve GET /comprobantes/:id. */
export interface LineaComprobante {
  id_detalle_comprobante: number
  descripcion: string
  FK_articulo: number | null
  cantidad: number
  precio_unitario: number
  /** Lo calcula el backend: cantidad * precio_unitario. */
  subtotal: number
}

/**
 * Cabecera de un comprobante: lo que devuelven POST, PATCH, /confirmar y
 * /anular, y la base del listado y del detalle.
 */
export interface Comprobante {
  id_comprobante_proveedor: number
  FK_tipo_comprobante: number
  letra: string
  punto_de_venta: number
  numero: number
  fecha_emision: string
  fecha_vencimiento: string
  FK_proveedor: number
  FK_orden_compra: number | null
  FK_comprobante_origen: number | null
  observaciones: string | null
  importe_neto: number
  alicuota_iva: number
  importe_iva: number
  importe_total: number
  saldo_pendiente: number | null
  estado: EstadoComprobante
  estado_saldo: EstadoSaldo | null
  motivo_anulacion: string | null
  hora_creacion: string
  hora_actualizacion: string | null
  FK_usuario_creador: number
  FK_usuario_actualizador: number
}

/**
 * Fila del listado (GET /comprobantes): un subconjunto de la cabecera, sin los
 * importes de detalle ni la auditoría — eso lo trae el detalle.
 */
export interface ComprobanteListItem {
  id_comprobante_proveedor: number
  FK_tipo_comprobante: number
  letra: string
  punto_de_venta: number
  numero: number
  fecha_emision: string
  fecha_vencimiento: string
  FK_proveedor: number
  importe_total: number
  saldo_pendiente: number | null
  estado: EstadoComprobante
  estado_saldo: EstadoSaldo | null
}

/** Nombre y apellido de quien creó o modificó un registro. */
export interface UsuarioResumen {
  nombre: string
  apellido: string
}

/**
 * Un pago que imputó este comprobante (HU-18). Llega vacío hasta que exista la
 * pantalla de pagos.
 */
export interface PagoImputado {
  id_pago: number
  fecha_pago: string
  importe_imputado: number
}

/** Respuesta de GET /comprobantes/:id: cabecera + líneas + trazabilidad. */
export interface ComprobanteDetalle extends Comprobante {
  detalle: LineaComprobante[]
  /** El comprobante anterior que lo motivó, si se cargó. Informativo, no afecta saldos. */
  comprobanteOrigen: ComprobanteListItem | null
  /** Los comprobantes que declararon a este como su origen. */
  notasAplicadas: ComprobanteListItem[]
  pagos: PagoImputado[]
  usuarioCreador: UsuarioResumen
  usuarioActualizador: UsuarioResumen
}

/** Una línea del detalle en el body de POST/PATCH. El subtotal lo calcula el backend. */
export interface LineaComprobantePayload {
  descripcion: string
  FK_articulo?: number
  cantidad: number
  precio_unitario: number
}

/** Body de POST /comprobantes. El comprobante queda en BORRADOR. */
export interface CrearComprobantePayload {
  FK_tipo_comprobante: number
  letra: string
  punto_de_venta: number
  numero: number
  fecha_emision: string
  fecha_vencimiento: string
  FK_proveedor: number
  FK_orden_compra?: number
  FK_comprobante_origen?: number
  observaciones?: string
  alicuota_iva: number
  detalle: LineaComprobantePayload[]
}

/** Body de PATCH /comprobantes/:id. Mismo shape que el alta, todo opcional. */
export type EditarComprobantePayload = Partial<CrearComprobantePayload>

/** Body de PATCH /comprobantes/:id/anular. */
export interface AnularComprobantePayload {
  motivo_anulacion: string
}

/** Valor del filtro de estado del comprobante. `''` = sin filtro (trae todos). */
export type FiltroEstadoComprobante = '' | EstadoComprobante

/** Valor del filtro de estado de saldo. `''` = sin filtro. */
export type FiltroEstadoSaldo = '' | EstadoSaldo

/** Valor del filtro de efecto del tipo sobre el saldo. `''` = sin filtro. */
export type FiltroEfectoSaldo = '' | 'true' | 'false'

/** Query params de GET /comprobantes. Los que van `undefined` no se envían. */
export interface ComprobantesQuery {
  FK_proveedor?: number
  FK_tipo_comprobante?: number
  /** El backend lo espera como `'true'`/`'false'`. */
  aumentaSaldo?: boolean
  estado?: EstadoComprobante
  estadoSaldo?: EstadoSaldo
  fechaDesde?: string
  fechaHasta?: string
  page?: number
  limit?: number
}