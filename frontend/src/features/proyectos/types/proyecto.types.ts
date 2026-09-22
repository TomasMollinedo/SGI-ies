// CONTRATO PROVISIONAL: confirmar con el módulo de Proyectos
export type EstadoProyecto = 'EN_PLANIFICACION' | 'EN_EJECUCION' | 'FINALIZADO' | 'CANCELADO'

export interface ProyectoResumen {
  id_proyecto: number
  codigo: string
  nombre: string
  estado: EstadoProyecto
}

export interface ProyectosQuery {
  busqueda?: string
  /** GET /proyectos soporta filtrar por estado (T102: la tabla emergente de alta solo quiere los que admiten unidades nuevas). */
  estado?: EstadoProyecto
  page?: number
  limit?: number
}

/**
 * Detalle de un proyecto (GET /proyectos/:id): además del resumen, la fecha
 * estimada de finalización y los dos valores que se calculan a partir de las
 * unidades funcionales activas — no se cargan ni se editan acá (T102).
 *
 * CONTRATO PROVISIONAL: confirmar con el módulo de Proyectos
 */
export interface ProyectoDetalle extends ProyectoResumen {
  localidad: string
  direccion: string | null
  fecha_fin_estimada: string | null
  cantidad_unidades_planificadas: number | null
  /** Cantidad de unidades funcionales activas cargadas en el proyecto. */
  unidades_cargadas: number
  /** Suma del costo de las unidades activas, en pesos. Se calcula, no se carga ni se edita. */
  presupuesto: number
}
