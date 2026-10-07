import type {
  EstadoComercialUnidad,
  Tipologia,
} from '../unidades-funcionales/types/unidadFuncional.types'

export type EstadoProyecto = 'EN_PLANIFICACION' | 'EN_EJECUCION' | 'FINALIZADO' | 'CANCELADO'

export type TipoImagenProyecto = 'RENDER' | 'PLANO'

/**
 * Ítem del listado (GET /proyectos): los datos propios del proyecto más los
 * valores que el backend calcula a partir de sus unidades funcionales
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
  /**
   * Porcentaje de unidades con venta vigente (En Plan de Pago o Vendida), de 0
   * a 100 con 2 decimales. La base son las unidades activas cargadas, no las
   * planificadas; sin unidades activas es 0.
   */
  porcentaje_vendido: number
}

/**
 * Valor del filtro de baja lógica tal como lo espera la query del backend:
 * sin `estado`, trae solo los activos.
 */
export type FiltroEstadoProyecto = 'true' | 'false' | 'todos'

export interface ProyectosQuery {
  busqueda?: string
  /**
   * Filtra por estado de obra (la tabla emergente del alta de unidades solo
   * quiere los que admiten unidades nuevas).
   */
  estado_obra?: EstadoProyecto
  /**
   * Baja lógica. Sin este parámetro el backend lista solo los activos; quien
   * necesita garantizarlo (ej. la tabla emergente de unidades) lo manda
   * explícito en vez de depender de ese default.
   */
  estado?: FiltroEstadoProyecto
  /** Coincidencia exacta, sin distinguir mayúsculas. Las opciones salen de GET /proyectos/localidades. */
  localidad?: string
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

/** Una unidad activa del proyecto, tal como la lista la ficha. */
export interface UnidadFichaProyecto {
  id_unidad_funcional: number
  identificador: string
  tipologia: Tipologia
  /** En m². */
  superficie_cubierta: number
  costo: number
  /** `null` si la unidad no tiene publicación vigente o todavía no tiene precio (En preparación). */
  precio_lista: number | null
  estado_comercial: EstadoComercialUnidad
}

/**
 * Ficha del proyecto (GET /proyectos/:id/ficha): lo que el backend calcula
 * sobre las unidades activas y no viene en el detalle. El presupuesto y las
 * unidades cargadas contra las planificadas siguen saliendo de GET /proyectos/:id.
 */
export interface ProyectoFicha {
  id_proyecto: number
  precio_estimado: {
    /** Suma del precio de lista de las unidades que tienen uno. */
    total: number
    /** Sobre cuántas unidades se calculó `total`: solo las que tienen precio de lista. */
    unidades_calculadas: number
  }
  situacion_comercial: {
    /** Siempre vienen los cinco estados, en 0 si no hay ninguna unidad en ese estado. */
    por_estado: Record<EstadoComercialUnidad, number>
    /** Mismo criterio que `ProyectoResumen.porcentaje_vendido`. */
    porcentaje_vendido: number
    /**
     * Al menos una unidad activa y todas con venta vigente. Es el dato para el
     * indicador "Todas las unidades vendidas": el porcentaje está redondeado.
     */
    todas_vendidas: boolean
  }
  /** Todas las unidades activas, ya ordenadas por identificador con orden natural. */
  unidades: UnidadFichaProyecto[]
}

/** Item del catálogo de localidades (GET /proyectos/localidades): `id` y `code` son la misma localidad. */
export interface LocalidadCatalogoItem {
  id: string
  code: string
  metadata: Record<string, unknown>
}

/**
 * Body de POST /proyectos. El código lo genera el sistema y el proyecto nace
 * En planificación y activo. Las fechas viajan como `YYYY-MM-DD`: el backend
 * las ancla a la medianoche de Argentina.
 */
export interface CrearProyectoPayload {
  nombre: string
  direccion: string
  localidad: string
  cantidad_unidades_planificadas: number
  descripcion?: string
  fecha_inicio?: string
  fecha_fin_estimada?: string
  imagen_portada_url?: string
}

/**
 * Body de PATCH /proyectos/:id. Edición parcial: solo se modifica lo que
 * llega. En los cuatro opcionales, `null` borra el valor guardado.
 */
export interface EditarProyectoPayload {
  nombre?: string
  direccion?: string
  localidad?: string
  cantidad_unidades_planificadas?: number
  descripcion?: string | null
  fecha_inicio?: string | null
  fecha_fin_estimada?: string | null
  imagen_portada_url?: string | null
}

/** Los únicos destinos que acepta PATCH /proyectos/:id/estado-obra. */
export type EstadoObraDestino = Extract<EstadoProyecto, 'EN_EJECUCION' | 'FINALIZADO'>

/** Body de POST /proyectos/:id/imagenes. Sin `orden`, la imagen va al final de la galería. */
export interface AgregarImagenProyectoPayload {
  url: string
  tipo: TipoImagenProyecto
  orden?: number
}
