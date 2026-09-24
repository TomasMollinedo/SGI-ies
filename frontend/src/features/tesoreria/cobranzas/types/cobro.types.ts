/**
 * Tipos de Cobros (HU-30), calcados de los DTOs de respuesta del backend
 * (`cobro-response.dto.ts`). Los importes viajan como `number`.
 *
 * El listado (GET /cobros), sus filtros y el resumen del período no están
 * acá: son de T115.
 */

/** El cobro nace CONFIRMADO (no hay borrador) y solo puede pasar a ANULADO. */
export type EstadoCobro = 'CONFIRMADO' | 'ANULADO'

/** PRESENCIAL = registrado por Tesorería; ECOMMERCE = una declaración de pago validada (HU-29). */
export type OrigenCobro = 'PRESENCIAL' | 'ECOMMERCE'

export interface ClienteResumenCobro {
  id_cliente: number
  nombre: string
  apellido: string | null
  dni_cuil: string | null
  email: string
}

export interface FormaPagoResumenCobro {
  id_forma_pago: number
  nombre: string
  requiere_referencia: boolean
}

/** Nombre y apellido de quien creó o modificó un registro. */
export interface UsuarioResumenCobro {
  nombre: string
  apellido: string
}

/** Venta de una cuota, identificada por su unidad. Mismo shape en cuotas imputables y en el detalle. */
export interface VentaResumenCuota {
  id_venta: number
  unidad: { identificador: string }
}

/**
 * Una cuota con saldo pendiente del cliente elegido, tal como la necesita
 * el formulario de cobro (GET /cobros/cuotas-imputables). `vencido` y
 * `dias_vencido` los calcula el backend; `dias_vencido` es 0 si todavía no
 * venció.
 */
export interface CuotaImputable {
  id_cuota: number
  numero: number
  fecha_vencimiento: string
  importe: number
  saldo_pendiente: number
  vencido: boolean
  dias_vencido: number
  venta: VentaResumenCuota
}

/** Respuesta de GET /cobros/cuotas-imputables. Sin paginar: el formulario necesita verlas todas. */
export interface CuotasImputablesResponse {
  data: CuotaImputable[]
}

/** Datos identificatorios de la cuota imputada en una línea del cobro. */
export interface CuotaResumenCobro {
  id_cuota: number
  numero: number
  FK_venta: number
  venta: VentaResumenCuota
}

/**
 * Una línea de imputación tal como quedó registrada. `saldo_anterior` y
 * `saldo_posterior` son la foto del saldo al confirmar el cobro: no se
 * recalculan, ni siquiera si el cobro se anula después.
 */
export interface LineaCobro {
  id_detalle_cobro: number
  FK_cuota: number
  importe_imputado: number
  saldo_anterior: number
  saldo_posterior: number
  cuota: CuotaResumenCobro
}

/** Respuesta de POST /cobros, GET /cobros/:id y PATCH /cobros/:id/anular. */
export interface CobroDetalle {
  id_cobro: number
  fecha_cobro: string
  numero_referencia: string | null
  importe_total: number
  observaciones: string | null
  origen: OrigenCobro
  estado: EstadoCobro
  motivo_anulacion: string | null
  hora_creacion: string
  hora_actualizacion: string | null
  FK_cliente: number
  FK_forma_pago: number
  FK_usuario_creador: number
  FK_usuario_actualizador: number
  cliente: ClienteResumenCobro
  formaPago: FormaPagoResumenCobro
  detalle: LineaCobro[]
  usuarioCreador: UsuarioResumenCobro
  usuarioActualizador: UsuarioResumenCobro
}

/** Una línea del detalle a enviar: cuánto de este cobro se imputa a una cuota puntual. */
export interface LineaImputacionCobroPayload {
  FK_cuota: number
  importe_imputado: number
}

/**
 * Body de POST /cobros. A diferencia de Pagos, `importe_total` lo declara
 * quien registra el cobro, y el backend exige que coincida con la suma del
 * detalle.
 */
export interface CrearCobroPayload {
  FK_cliente: number
  FK_forma_pago: number
  fecha_cobro?: string
  numero_referencia?: string
  importe_total: number
  observaciones?: string
  detalle: LineaImputacionCobroPayload[]
}

/** Body de PATCH /cobros/:id/anular. */
export interface AnularCobroPayload {
  motivo_anulacion: string
}
