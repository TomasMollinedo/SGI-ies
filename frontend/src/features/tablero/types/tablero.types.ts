export type Agrupacion = 'MENSUAL' | 'TRIMESTRAL' | 'ANUAL'

export interface FiltrosTablero {
  agrupacion: Agrupacion
  /** ISO 8601 con offset; el backend exige `fechaDesde` y `fechaHasta` juntas. */
  fechaDesde: string
  fechaHasta: string
  /** Acota los ingresos a un proyecto. Los egresos no se filtran y el resultado viaja en `null`. */
  FK_proyecto?: number
}

export interface IngresoPorProyecto {
  proyecto: { id_proyecto: number; nombre: string }
  total: number
}

export interface PeriodoTablero {
  /** "2026-03", "2026-T1" o "2026", según la agrupación. */
  etiqueta: string
  desde: string
  hasta: string
  ingresos: number
  egresos: number
  /** Ingresos − egresos. `null` si se filtra por proyecto: los egresos no se pueden atribuir a uno. */
  resultado: number | null
  ingresosPorProyecto: IngresoPorProyecto[]
}

export interface TotalesTablero {
  ingresos: number
  egresos: number
  resultado: number | null
  ingresosPorProyecto: IngresoPorProyecto[]
}

/** Variación porcentual contra el rango anterior; `null` si ese rango estuvo en cero. */
export interface VariacionTablero {
  ingresos: number | null
  egresos: number | null
  resultado: number | null
}

export interface IngresosEgresosResponse {
  filtros: {
    agrupacion: Agrupacion
    fechaDesde: string
    fechaHasta: string
    FK_proyecto: number | null
  }
  periodos: PeriodoTablero[]
  totales: TotalesTablero
  rangoAnterior: {
    desde: string
    hasta: string
    ingresos: number
    egresos: number
    resultado: number | null
  }
  variacion: VariacionTablero
}

/** Un margen (realizado o proyectado): su importe y qué porcentaje representa sobre las ventas. */
export interface MargenTablero {
  importe: number
  /** Margen ÷ suma de los precios de las unidades que entraron × 100. 0 si no entró ninguna. */
  porcentaje: number
}

/** Fila de GET /tablero/margen-proyecto: un proyecto activo. */
export interface MargenProyectoItem {
  proyecto: { id_proyecto: number; codigo: string; nombre: string }
  unidades_activas: number
  /** Con venta vigente. */
  unidades_vendidas: number
  porcentaje_vendidas: number
  /** Activas sin publicación vigente, o publicadas En preparación (sin precio de lista). */
  unidades_fuera_de_calculo: number
  /** Unidades con venta vigente: precio de venta − costo. */
  margen_realizado: MargenTablero
  /** Unidades Disponibles: precio de lista − costo. */
  margen_proyectado: MargenTablero
  /** Realizado + proyectado. */
  margen_total_esperado: number
}

export interface MargenProyectoResponse {
  proyectos: MargenProyectoItem[]
  /** De todos los proyectos. Solo el importe: no lleva porcentaje. */
  margen_total_realizado: number
}

/** Una fila de un ranking de ingresos: un proyecto o un cliente y lo que aportó. */
export interface ItemRanking {
  id: number
  nombre: string
  total: number
}

/** Un ranking ya ordenado y recortado, con el total de ingresos del que se mide su peso. */
export interface Ranking {
  items: ItemRanking[]
  totalIngresos: number
}
