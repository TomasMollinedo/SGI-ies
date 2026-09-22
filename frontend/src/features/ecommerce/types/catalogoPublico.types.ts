/**
 * Contratos de la API pública del catálogo (T107, `GET /catalogo/**`). Son los
 * del backend tal cual (`catalogo-response.dto.ts`), en snake_case: no se
 * renombran campos acá para que el mapeo con el endpoint sea evidente.
 */

/** Un proyecto del listado de destacados de la landing. */
export interface ProyectoDestacado {
  id_proyecto: number
  nombre: string
  localidad: string
  /** Null si el proyecto todavía no tiene portada cargada. */
  imagen_portada_url: string | null
  cantidad_disponibles: number
  /** El menor precio entre los planes de pago activos del proyecto. */
  precio_desde: number
}

/** `GET /catalogo/destacados`: hasta 4 proyectos, `[]` si no hay ninguno disponible. */
export interface ProyectosDestacadosResponse {
  data: ProyectoDestacado[]
}
