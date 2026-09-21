import type { EstadoProyecto } from '@/features/proyectos/types/proyecto.types'

export type EstadoComercial = 'EN_PREPARACION' | 'DISPONIBLE' | 'EN_PLAN_DE_PAGO' | 'VENDIDA'

export type TipologiaUnidad =
  | 'MONOAMBIENTE'
  | 'UN_DORMITORIO'
  | 'DOS_DORMITORIOS'
  | 'TRES_DORMITORIOS'
  | 'LOCAL_COMERCIAL'
  | 'COCHERA'
  | 'OTRO'

export type CodigoCondicionEntrega = 'TERMINADA' | 'A_ENTREGAR_CON_FECHA' | 'A_ENTREGAR_SIN_FECHA'

export interface CondicionEntrega {
  codigo: CodigoCondicionEntrega
  texto: string
  fecha_referencia: string | null
}

export interface UnidadResumen {
  id_unidad_funcional: number
  identificador: string
  tipologia: TipologiaUnidad
}

export interface ProyectoPublicacion {
  id_proyecto: number
  codigo: string
  nombre: string
}

/** Ítem de GET /publicaciones. */
export interface PublicacionListItem {
  id_publicacion: number
  estado_comercial: EstadoComercial
  vigente: boolean
  fecha_publicacion: string
  fecha_despublicacion: string | null
  unidad: UnidadResumen
  proyecto: ProyectoPublicacion
}

export interface PublicacionesQuery {
  vigente?: boolean
  estado_comercial?: EstadoComercial
  FK_proyecto?: number
  tipologia?: TipologiaUnidad
  page?: number
  limit?: number
}

/** Respuesta de POST /publicaciones, GET /publicaciones/:id y PATCH .../despublicar. */
export interface PublicacionDetalle {
  id_publicacion: number
  FK_unidad_funcional: number
  estado_comercial: EstadoComercial
  vigente: boolean
  fecha_publicacion: string
  fecha_despublicacion: string | null
  motivo_despublicacion: string | null
  hora_creacion: string
  hora_actualizacion: string | null
  unidad: UnidadResumen & {
    superficie_cubierta: number
    superficie_descubierta: number | null
    piso: string | null
    comodidades: string | null
    observaciones: string | null
    /**
     * Solo lo trae el detalle, que es de la pantalla interna: el listado y el
     * catálogo público no lo exponen. Lo necesita Planes de Pago (HU-22) como
     * referencia para cargar los precios.
     *
     * `string` y no `number` porque es un `Decimal` del backend — ver el
     * encabezado de `planPago.types.ts`.
     */
    costo: string
  }
  imagenes: { id_imagen_unidad: number; url: string; orden: number }[]
  proyecto: ProyectoPublicacion & {
    localidad: string
    estado: EstadoProyecto
    fecha_fin_estimada: string | null
  }
  condicion_entrega: CondicionEntrega
  usuarioCreador: { nombre: string; apellido: string }
  usuarioActualizador: { nombre: string; apellido: string }
}

/** Ítem de GET /publicaciones/unidades-publicables. */
export interface UnidadPublicable {
  unidad: UnidadResumen & {
    superficie_cubierta: number
    superficie_descubierta: number | null
    piso: string | null
    comodidades: string | null
  }
  proyecto: ProyectoPublicacion & { estado: EstadoProyecto }
  publicable: boolean
  motivo_no_publicable: string | null
}

export interface UnidadesPublicablesQuery {
  FK_proyecto?: number
  tipologia?: TipologiaUnidad
  page?: number
  limit?: number
}

export interface CrearPublicacionPayload {
  FK_unidad_funcional: number
}

export interface DespublicarPublicacionPayload {
  motivo_despublicacion: string
}
