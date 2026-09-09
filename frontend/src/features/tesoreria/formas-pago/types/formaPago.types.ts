/** Fila del listado (GET /formas-pago). No trae datos de auditoría — eso es del detalle. */
export interface FormaPago {
  id_forma_pago: number
  nombre: string
  descripcion: string | null
  /**
   * Si la forma de pago exige cargar un número de referencia (nro. de operación
   * de una transferencia, nro. de cheque). Se define en el alta y no es
   * editable después.
   */
  requiere_referencia: boolean
  estado: boolean
}

/** Nombre y apellido de quien creó o modificó un registro. */
export interface UsuarioResumen {
  nombre: string
  apellido: string
}

/** Shape de crear/editar/dar de baja/reactivar: la fila + campos de auditoría. */
export interface FormaPagoAuditada extends FormaPago {
  hora_creacion: string
  hora_actualizacion: string | null
  FK_usuario_creador: number
  FK_usuario_actualizador: number
}

/**
 * Respuesta de GET /formas-pago/:id: FormaPagoAuditada + quién la creó y quién
 * la modificó por última vez. Las dos relaciones son obligatorias en el
 * backend (FORMAPAGO.usuarioCreador / usuarioActualizador no son nullables),
 * así que siempre vienen.
 */
export interface FormaPagoDetalle extends FormaPagoAuditada {
  usuarioCreador: UsuarioResumen
  usuarioActualizador: UsuarioResumen
}

/**
 * Body de POST /formas-pago. La descripción se omite si el usuario no cargó
 * ninguna; `requiere_referencia` es obligatorio y es el único momento en que se
 * define.
 */
export interface CrearFormaPagoPayload {
  nombre: string
  descripcion?: string
  requiere_referencia: boolean
}

/**
 * Body de PATCH /formas-pago/:id. A propósito no se deriva de
 * `CrearFormaPagoPayload`: se declara solo con los campos editables, y
 * `requiere_referencia: never` deja que el compilador rechace el intento de
 * mandarlo —incluso al armar el body con un spread—, porque el indicador es
 * inmutable después del alta.
 */
export interface EditarFormaPagoPayload {
  nombre?: string
  descripcion?: string
  requiere_referencia?: never
}

/**
 * Valor del filtro de estado. A diferencia del resto de los ABM, acá no hay
 * opción "sin filtro": omitir el parámetro trae **solo las activas**, así que
 * para ver todas hay que mandar `'todos'` explícito.
 */
export type FiltroEstado = 'true' | 'false' | 'todos'

/** Query params de GET /formas-pago. Los que van `undefined` no se envían. */
export interface FormasPagoQuery {
  nombre?: string
  estado?: FiltroEstado
  page?: number
  limit?: number
}
