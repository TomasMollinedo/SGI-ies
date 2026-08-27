export interface CategoriaResumen {
  id_categoria: number
  nombre: string
}

export interface MarcaResumen {
  id_marca: number
  nombre: string
}

export interface UnidadMedidaResumen {
  id_unidad_medida: number
  nombre: string
  abreviatura: string
}

/** Fila del listado (GET /articulos). No trae datos de auditoría — eso es del detalle. */
export interface Articulo {
  id_articulo: number
  codigo: string
  nombre: string
  descripcion: string | null
  estado: boolean
  FK_Categoria: number
  FK_Marca: number | null
  FK_UnidadMedida: number
  categoria: CategoriaResumen
  marca: MarcaResumen | null
  unidadMedida: UnidadMedidaResumen
}

/** Nombre y apellido de quien creó o modificó un registro. */
export interface UsuarioResumen {
  nombre: string
  apellido: string
}

/** Shape de crear/editar/dar de baja/reactivar: Articulo (sin relaciones) + campos de auditoría. */
export interface ArticuloAuditada {
  id_articulo: number
  codigo: string
  nombre: string
  descripcion: string | null
  estado: boolean
  FK_Categoria: number
  FK_Marca: number | null
  FK_UnidadMedida: number
  hora_creacion: string
  hora_actualizacion: string | null
  FK_usuario_creador: number
  FK_usuario_actualizador: number
}

/** Respuesta de GET /articulos/:id: ArticuloAuditada + relaciones + quién lo creó/modificó. */
export interface ArticuloDetalle extends ArticuloAuditada {
  categoria: CategoriaResumen
  marca: MarcaResumen | null
  unidadMedida: UnidadMedidaResumen
  usuarioCreador: UsuarioResumen
  usuarioActualizador: UsuarioResumen
}

/**
 * Body de POST /articulos. `codigo` sigue siendo obligatorio porque así lo
 * pide el backend hoy; cuando pase a autogenerarse server-side, sale de acá.
 */
export interface CrearArticuloPayload {
  codigo: string
  nombre: string
  descripcion?: string
  FK_Categoria: number
  FK_UnidadMedida: number
  FK_Marca?: number
}

/**
 * Body de PATCH /articulos/:id. Todos los campos son opcionales.
 * A diferencia de crear, `FK_Marca` acepta `null` explícito para quitar la
 * marca asignada; omitirlo deja la marca como está.
 */
export type EditarArticuloPayload = Partial<Omit<CrearArticuloPayload, 'FK_Marca'>> & {
  FK_Marca?: number | null
}

/**
 * Valor del filtro de estado tal como lo maneja el `<Select>`: string vacío
 * para "Todos", y los mismos `'true'`/`'false'` que espera la query del
 * backend. Se traduce a `boolean | undefined` recién al armar el request.
 */
export type FiltroEstado = '' | 'true' | 'false'

/** Query params de GET /articulos. Los que van `undefined` no se envían. */
export interface ArticulosQuery {
  busqueda?: string
  FK_Categoria?: number
  FK_Marca?: number
  estado?: boolean
  page?: number
  limit?: number
}
