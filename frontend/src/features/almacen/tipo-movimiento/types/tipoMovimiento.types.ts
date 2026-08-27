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

/** Respuesta de GET /tipos-movimiento/:id: la fila + trazabilidad y quién la creó/modificó. */
export interface TipoMovimientoDetalle extends TipoMovimiento {
  hora_creacion: string
  hora_actualizacion: string | null
  FK_usuario_creador: number
  FK_usuario_actualizador: number
  usuarioCreador: UsuarioResumen | null
  usuarioActualizador: UsuarioResumen | null
}

/**
 * Valor del filtro de estado tal como lo maneja el `<Select>`. A diferencia del
 * resto de los catálogos de Almacén no tiene un "Todos": sin el parámetro el
 * backend devuelve solo los activos, así que omitirlo no traería ambos.
 */
export type FiltroEstado = 'true' | 'false'

/**
 * Valor del filtro de signo. Acá sí hay "Todos" (string vacío): sin el parámetro
 * el backend trae entradas y salidas.
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
