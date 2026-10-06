import type { EstadoProyecto } from '@/features/proyectos/types/proyecto.types'

export type Tipologia =
  | 'MONOAMBIENTE'
  | 'UN_DORMITORIO'
  | 'DOS_DORMITORIOS'
  | 'TRES_DORMITORIOS'
  | 'LOCAL_COMERCIAL'
  | 'COCHERA'
  | 'OTRO'

/** Item del catálogo de tipologías (GET /unidades-funcionales/tipologias). */
export interface TipologiaCatalogoItem {
  id: Tipologia
  code: string
  metadata: Record<string, unknown>
}

export type CondicionEntregaCodigo = 'TERMINADA' | 'A_ENTREGAR_CON_FECHA' | 'A_ENTREGAR_SIN_FECHA'

/** El texto lo calcula el backend (única fuente de verdad); acá solo se muestra. */
export interface CondicionEntrega {
  codigo: CondicionEntregaCodigo
  texto: string
  fecha_referencia: string | null
}

/** El proyecto tal como viaja embebido en la unidad (no es el `ProyectoResumen` de la feature Proyectos). */
export interface ProyectoDeUnidad {
  id_proyecto: number
  codigo: string
  nombre: string
  estado: EstadoProyecto
  fecha_fin_estimada: string | null
}

export interface ImagenUnidad {
  id_imagen_unidad: number
  url: string
  orden: number
}

export interface UsuarioResumen {
  nombre: string
  apellido: string
}

/**
 * Valor del filtro de estado tal como lo maneja el `<Select>` y tal como lo
 * espera la query del backend: sin `estado`, el backend trae solo las activas.
 */
export type FiltroEstado = 'true' | 'false' | 'todos'

/**
 * Fila del listado (GET /unidades-funcionales). `costo_editable` en `false`
 * significa que la unidad tiene o tuvo alguna publicación: el costo quedó
 * fijo para siempre.
 */
export interface UnidadFuncionalListItem {
  id_unidad_funcional: number
  FK_proyecto: number
  identificador: string
  tipologia: Tipologia
  superficie_cubierta: number
  superficie_descubierta: number | null
  piso: string | null
  comodidades: string | null
  observaciones: string | null
  costo: number
  estado: boolean
  costo_editable: boolean
  proyecto: ProyectoDeUnidad
  condicion_entrega: CondicionEntrega
}

/**
 * Detalle (GET /unidades-funcionales/:id, y lo que devuelven el alta, la
 * edición, la baja, la reactivación y las operaciones de imágenes).
 */
export interface UnidadFuncionalDetalle extends UnidadFuncionalListItem {
  hora_creacion: string
  hora_actualizacion: string | null
  FK_usuario_creador: number
  FK_usuario_actualizador: number
  /** Explicación para mostrar junto al costo deshabilitado; `null` si el costo es editable. */
  motivo_costo_no_editable: string | null
  imagenes: ImagenUnidad[]
  usuarioCreador: UsuarioResumen
  usuarioActualizador: UsuarioResumen
}

/**
 * Query params de GET /unidades-funcionales. El rango de superficie es sobre
 * la superficie cubierta. Los que van `undefined` no se envían.
 */
export interface UnidadesFuncionalesQuery {
  FK_proyecto?: number
  tipologia?: Tipologia
  superficie_min?: number
  superficie_max?: number
  estado?: FiltroEstado
  page?: number
  limit?: number
}

/** Body de POST /unidades-funcionales. El sistema opera en una única moneda: no hay campo de moneda. */
export interface CrearUnidadFuncionalPayload {
  FK_proyecto: number
  identificador: string
  tipologia: Tipologia
  superficie_cubierta: number
  costo: number
  piso?: string
  superficie_descubierta?: number | null
  comodidades?: string
  observaciones?: string
}

/**
 * Body de PATCH /unidades-funcionales/:id. Todo opcional; sin `FK_proyecto`
 * porque una unidad no cambia de proyecto.
 */
export type EditarUnidadFuncionalPayload = Partial<Omit<CrearUnidadFuncionalPayload, 'FK_proyecto'>>
