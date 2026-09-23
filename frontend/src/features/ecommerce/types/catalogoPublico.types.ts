import type { CondicionEntrega, TipologiaUnidad } from '@/shared/types/unidadFuncional.types'

/**
 * Contratos de la API pública del catálogo (T107, `GET /catalogo/**`). Son los
 * del backend tal cual (`catalogo-response.dto.ts`), en snake_case: no se
 * renombran campos acá para que el mapeo con el endpoint sea evidente.
 *
 * Solo campos públicos: el backend nunca manda costo, presupuesto ni margen, y
 * estos tipos tampoco los declaran.
 */

/** Proyecto al que pertenece una unidad, tal como lo expone el catálogo. */
interface ProyectoResumen {
  nombre: string
  localidad: string
}

/** Ítem de `GET /catalogo`: una unidad disponible. */
export interface UnidadCatalogo {
  id_unidad_funcional: number
  identificador: string
  tipologia: TipologiaUnidad
  superficie_cubierta: number
  superficie_descubierta: number | null
  piso: string | null
  proyecto: ProyectoResumen
  /** Portada de la unidad. Null si todavía no tiene imágenes cargadas. */
  imagen_url: string | null
  /** El menor precio entre los planes de pago activos. */
  precio_desde: number
  condicion_entrega: CondicionEntrega
  fecha_publicacion: string
}

/**
 * Filtros de `GET /catalogo`. Los nombres son los del endpoint (`FK_proyecto`,
 * `entregada`), no unos propios del front.
 *
 * No incluye rango de superficie: el endpoint todavía no lo soporta (ver
 * `CatalogoPage`).
 */
export interface FiltrosCatalogo {
  FK_proyecto?: number
  tipologia?: TipologiaUnidad
  /** `true` = ya entregada; `false` = a entregar; `undefined` = todas. */
  entregada?: boolean
  page: number
  limit: number
}

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

/** Tipo de plan de pago, tal como lo expone el catálogo. */
export type TipoPlanPago = 'CONTADO' | 'FINANCIADO'

export type Periodicidad = 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL'

/** Plan de pago activo de una unidad. Solo lectura: el catálogo no opera sobre ellos. */
export interface PlanPagoPublico {
  nombre: string
  tipo: TipoPlanPago
  precio: number
  anticipo_porcentaje: number | null
  anticipo_monto: number | null
  cantidad_cuotas: number | null
  periodicidad: Periodicidad | null
}

export interface ImagenUnidad {
  url: string
  orden: number
}

/**
 * `GET /catalogo/:id`: todo lo del listado, más lo que no entra en una tarjeta
 * (comodidades, galería y los planes de pago activos con su precio).
 */
export interface UnidadCatalogoDetalle extends UnidadCatalogo {
  comodidades: string | null
  observaciones: string | null
  imagenes: ImagenUnidad[]
  planes: PlanPagoPublico[]
}

/** `GET /catalogo/destacados`: hasta 4 proyectos, `[]` si no hay ninguno disponible. */
export interface ProyectosDestacadosResponse {
  data: ProyectoDestacado[]
}
