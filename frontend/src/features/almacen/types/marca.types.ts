/** Fila del listado (GET /marcas). No trae datos de auditoría — eso es del detalle. */
export interface Marca {
  id_marca: number
  nombre: string
  descripcion: string | null
  estado: boolean
}

/** Nombre y apellido de quien creó o modificó un registro. */
export interface UsuarioResumen {
  nombre: string
  apellido: string
}

/** Respuesta de GET /marcas/:id: la marca más su trazabilidad. */
export interface MarcaDetalle extends Marca {
  hora_creacion: string
  hora_actualizacion: string | null
  FK_usuario_creador: number
  FK_usuario_actualizador: number
  usuarioCreador: UsuarioResumen
  usuarioActualizador: UsuarioResumen | null
}

/**
 * Valor del filtro de estado tal como lo maneja el `<Select>`: string vacío
 * para "Todos", y los mismos `'true'`/`'false'` que espera la query del
 * backend. Se traduce a `boolean | undefined` recién al armar el request.
 */
export type FiltroEstado = '' | 'true' | 'false'

/** Query params de GET /marcas. Los que van `undefined` no se envían. */
export interface MarcasQuery {
  nombre?: string
  estado?: boolean
  page?: number
  limit?: number
}
