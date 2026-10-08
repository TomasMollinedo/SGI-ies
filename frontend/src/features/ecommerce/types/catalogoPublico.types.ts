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
  /** El precio de lista de la unidad: su precio de contado. */
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
  /** El menor precio de lista entre las unidades disponibles del proyecto. */
  precio_desde: number
}

/**
 * Plan de ejemplo (HU-22) de una unidad, ya calculado por el backend con el
 * precio de lista y la TNA vigente de su plazo: el front solo lo muestra.
 */
export interface PlanEjemplo {
  nombre: string
  anticipo_porcentaje: number
  anticipo_monto: number
  saldo_financiado: number
  cantidad_cuotas: number
  tasa_nominal_anual: number
  valor_cuota: number
  total_intereses: number
  total_a_pagar: number
}

/** Plazo de financiación activo que el visitante puede elegir al simular. */
export interface PlazoSimulador {
  id_plazo_financiacion: number
  cantidad_cuotas: number
  tasa_nominal_anual: number
}

export interface ImagenUnidad {
  url: string
  orden: number
}

/**
 * `GET /catalogo/:id`: todo lo del listado, más lo que no entra en una tarjeta
 * (comodidades, galería, planes de ejemplo y plazos del simulador).
 *
 * `precio_desde` es el precio de lista de la unidad, o sea su precio de contado.
 * `simulador` es `null` cuando no hay ningún plazo activo: en ese caso solo
 * corresponde mostrar el precio de contado.
 */
export interface UnidadCatalogoDetalle extends UnidadCatalogo {
  comodidades: string | null
  observaciones: string | null
  imagenes: ImagenUnidad[]
  planes: PlanEjemplo[]
  simulador: { plazos: PlazoSimulador[] } | null
}

/** `GET /catalogo/destacados`: hasta 4 proyectos, `[]` si no hay ninguno disponible. */
export interface ProyectosDestacadosResponse {
  data: ProyectoDestacado[]
}

/**
 * Body de `POST /catalogo/:id/simulacion`. El anticipo va por porcentaje o por
 * monto, nunca por los dos: el backend rechaza ambos o ninguno.
 */
export type SimularPlanPayload = { FK_plazo_financiacion: number } & (
  | { anticipo_porcentaje: number; anticipo_monto?: never }
  | { anticipo_monto: number; anticipo_porcentaje?: never }
)

/** Una fila del cronograma simulado. La cuota 0 es el anticipo. */
export interface CuotaSimulada {
  numero: number
  importe_capital: number
  importe_interes: number
  importe: number
}

/** Respuesta de `POST /catalogo/:id/simulacion`. No guarda nada: es solo consulta. */
export interface SimulacionCatalogo {
  precio_lista: number
  anticipo_monto: number
  anticipo_porcentaje: number
  saldo_financiado: number
  plazo: PlazoSimulador
  tasa_mensual: number
  valor_cuota: number
  total_intereses: number
  total_a_pagar: number
  cronograma: CuotaSimulada[]
}
