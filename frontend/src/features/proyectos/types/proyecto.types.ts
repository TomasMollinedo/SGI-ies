export type EstadoProyecto = 'EN_PLANIFICACION' | 'EN_EJECUCION' | 'FINALIZADO' | 'CANCELADO'

export type TipoImagenProyecto = 'RENDER' | 'PLANO'

/**
 * Ítem del listado (GET /proyectos): los datos propios del proyecto más los
 * dos valores que el backend calcula a partir de sus unidades funcionales
 * activas — no se cargan ni se editan.
 */
export interface ProyectoResumen {
  id_proyecto: number
  codigo: string
  nombre: string
  descripcion: string | null
  localidad: string
  direccion: string
  fecha_inicio: string | null
  fecha_fin_estimada: string | null
  /** Estado de avance de la obra. */
  estado_obra: EstadoProyecto
  /** Baja lógica: `false` si el proyecto fue dado de baja. */
  estado: boolean
  cantidad_unidades_planificadas: number
  imagen_portada_url: string | null
  /** Cantidad de unidades funcionales activas cargadas en el proyecto. */
  unidades_cargadas: number
  /** Suma del costo de las unidades activas, en pesos. Se calcula, no se carga ni se edita. */
  presupuesto: number
}

export interface ProyectosQuery {
  busqueda?: string
  /**
   * Filtra por estado de obra (la tabla emergente del alta de unidades solo
   * quiere los que admiten unidades nuevas). La baja lógica no se filtra desde
   * acá: sin ese parámetro, el backend lista solo los proyectos activos.
   */
  estado_obra?: EstadoProyecto
  page?: number
  limit?: number
}

export interface ImagenProyecto {
  id_imagen_proyecto: number
  url: string
  tipo: TipoImagenProyecto
  orden: number
}

interface UsuarioResumen {
  nombre: string
  apellido: string
}

/**
 * Detalle de un proyecto (GET /proyectos/:id): lo del listado más las
 * imágenes de diseño (ordenadas por `orden`) y quién lo creó y modificó.
 */
export interface ProyectoDetalle extends ProyectoResumen {
  imagenes: ImagenProyecto[]
  hora_creacion: string
  hora_actualizacion: string | null
  FK_usuario_creador: number
  FK_usuario_actualizador: number
  usuarioCreador: UsuarioResumen
  usuarioActualizador: UsuarioResumen
}
