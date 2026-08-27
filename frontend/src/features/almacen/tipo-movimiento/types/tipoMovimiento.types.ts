/** Fila del listado (GET /tipos-movimiento). No trae datos de auditoría — eso es del detalle. */
export interface TipoMovimiento {
  id_tipo_movimiento: number
  nombre: string
  descripcion: string | null
  /** `true` suma stock (entrada), `false` lo resta (salida). No es editable después del alta. */
  indicador_entrada: boolean
  estado: boolean
}

/** Nombre y apellido de quien creó o modificó un registro. */
export interface UsuarioResumen {
  nombre: string
  apellido: string
}

/** Shape de crear/editar/dar de baja/reactivar: la fila + campos de auditoría. */
export interface TipoMovimientoAuditado extends TipoMovimiento {
  hora_creacion: string
  hora_actualizacion: string | null
  FK_usuario_creador: number
  FK_usuario_actualizador: number
}

/** Respuesta de GET /tipos-movimiento/:id: TipoMovimientoAuditado + quién lo creó/modificó. */
export interface TipoMovimientoDetalle extends TipoMovimientoAuditado {
  usuarioCreador: UsuarioResumen | null
  usuarioActualizador: UsuarioResumen | null
}

/**
 * Body de POST /tipos-movimiento. La descripción se omite si el usuario no
 * cargó ninguna; `indicador_entrada` es obligatorio y es el único momento en
 * que se define.
 */
export interface CrearTipoMovimientoPayload {
  nombre: string
  descripcion?: string
  indicador_entrada: boolean
}

/**
 * Body de PATCH /tipos-movimiento/:id. A propósito no se deriva de
 * `CrearTipoMovimientoPayload`: se declara solo con los campos editables, y el
 * `indicador_entrada: never` deja que el compilador rechace el intento de
 * mandarlo —incluso al armar el body con un spread—, porque el signo del tipo
 * de movimiento es inmutable después del alta.
 */
export interface EditarTipoMovimientoPayload {
  nombre?: string
  descripcion?: string
  indicador_entrada?: never
}

/**
 * Valor del filtro de estado tal como lo maneja el `<Select>`: string vacío
 * para "Todos", y los mismos `'true'`/`'false'` que espera la query del
 * backend. Se traduce a `boolean | undefined` recién al armar el request.
 */
export type FiltroEstado = '' | 'true' | 'false'

/**
 * Valor del filtro de indicador, con el mismo criterio que `FiltroEstado`: sin
 * el parámetro el backend trae entradas y salidas.
 */
export type FiltroIndicador = '' | 'true' | 'false'

/** Query params de GET /tipos-movimiento. Los que van `undefined` no se envían. */
export interface TiposMovimientoQuery {
  nombre?: string
  estado?: boolean
  indicadorEntrada?: boolean
  page?: number
  limit?: number
}
