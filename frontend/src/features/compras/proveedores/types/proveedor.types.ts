/**
 * Item del catálogo de condiciones frente al IVA (GET /proveedores/condiciones-iva).
 * `id` es lo que se manda al backend para filtrar; `code` es lo que se le
 * muestra al usuario. `metadata` no se usa en el frontend.
 */
export interface CondicionIva {
  id: string
  code: string
  metadata: Record<string, unknown>
}

/** Fila del listado (GET /proveedores). `condicion_iva` es el `id` del catálogo. */
export interface Proveedor {
  id_proveedor: number
  razon_social: string
  cuit: string
  condicion_iva: string
  domicilio: string
  telefono: string
  correo: string
  observaciones: string
  estado: boolean
}

/**
 * Valor del filtro de estado tal como lo maneja el `<Select>` y tal como lo
 * espera la query del backend: a diferencia de otros listados, acá "todos" es
 * un valor explícito y no la ausencia del parámetro — sin `estado`, el backend
 * trae solo los activos.
 */
export type FiltroEstado = 'true' | 'false' | 'todos'

/** Query params de GET /proveedores. Los que van `undefined` no se envían. */
export interface ProveedoresQuery {
  busqueda?: string
  /** El `id` del catálogo de condiciones frente al IVA. */
  condicionIva?: string
  estado?: FiltroEstado
  page?: number
  limit?: number
}

/** Body de POST /proveedores. Razón social, CUIT y condición IVA son obligatorios. */
export interface CrearProveedorPayload {
  razon_social: string
  cuit: string
  /** El `id` del catálogo de condiciones frente al IVA. */
  condicion_iva: string
  domicilio?: string
  telefono?: string
  correo?: string
  observaciones?: string
}
