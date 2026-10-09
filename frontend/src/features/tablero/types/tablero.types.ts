export type Agrupacion = 'MENSUAL' | 'TRIMESTRAL' | 'ANUAL'

export interface FiltrosTablero {
  agrupacion: Agrupacion
  /** ISO 8601 con offset; el backend exige `fechaDesde` y `fechaHasta` juntas. */
  fechaDesde: string
  fechaHasta: string
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
  /** Ingresos − egresos. `null` solo si se filtra por proyecto, filtro que esta pantalla no usa. */
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
