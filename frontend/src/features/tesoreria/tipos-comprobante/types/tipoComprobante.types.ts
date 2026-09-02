/** Fila del listado (GET /tipos-comprobante). No trae datos de auditoría — eso es del detalle. */
export interface TipoComprobante {
  id_tipo_comprobante: number
  nombre: string
  descripcion: string | null
  /**
   * `true` aumenta el saldo de la cuenta corriente del proveedor, `false` lo
   * disminuye. No es editable después del alta.
   */
  aumenta_saldo: boolean
  /**
   * Si el comprobante necesita referenciar un comprobante de origen (ej. una
   * Nota de Crédito sobre una Factura). No es editable después del alta.
   */
  requiere_comprobante_origen: boolean
  estado: boolean
}

/** Nombre y apellido de quien creó o modificó un registro. */
export interface UsuarioResumen {
  nombre: string
  apellido: string
}

/** Shape de crear/editar/dar de baja/reactivar: la fila + campos de auditoría. */
export interface TipoComprobanteAuditado extends TipoComprobante {
  hora_creacion: string
  hora_actualizacion: string | null
  FK_usuario_creador: number
  FK_usuario_actualizador: number
}

/** Respuesta de GET /tipos-comprobante/:id: TipoComprobanteAuditado + quién lo creó/modificó. */
export interface TipoComprobanteDetalle extends TipoComprobanteAuditado {
  usuarioCreador: UsuarioResumen | null
  usuarioActualizador: UsuarioResumen | null
}

/**
 * Body de POST /tipos-comprobante. La descripción se omite si el usuario no
 * cargó ninguna; `aumenta_saldo` y `requiere_comprobante_origen` son
 * obligatorios y es el único momento en que se definen.
 */
export interface CrearTipoComprobantePayload {
  nombre: string
  descripcion?: string
  aumenta_saldo: boolean
  requiere_comprobante_origen: boolean
}

/**
 * Body de PATCH /tipos-comprobante/:id. A propósito no se deriva de
 * `CrearTipoComprobantePayload`: se declara solo con los campos editables, y
 * `aumenta_saldo: never` / `requiere_comprobante_origen: never` dejan que el
 * compilador rechace el intento de mandarlos —incluso al armar el body con un
 * spread—, porque los dos indicadores son inmutables después del alta.
 */
export interface EditarTipoComprobantePayload {
  nombre?: string
  descripcion?: string
  aumenta_saldo?: never
  requiere_comprobante_origen?: never
}

export type FiltroEstado = '' | 'true' | 'false'

/**
 * Valor del filtro de efecto sobre el saldo, con el mismo criterio que
 * `FiltroEstado`: sin el parámetro el backend trae los que aumentan y los que
 * disminuyen.
 */
export type FiltroEfectoSaldo = '' | 'true' | 'false'

/** Query params de GET /tipos-comprobante. Los que van `undefined` no se envían. */
export interface TiposComprobanteQuery {
  nombre?: string
  estado?: boolean
  aumentaSaldo?: boolean
  page?: number
  limit?: number
}
