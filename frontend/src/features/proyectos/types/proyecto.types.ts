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
  page?: number
  limit?: number
}
