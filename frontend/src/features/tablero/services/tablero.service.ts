import { httpClient } from '@/shared/api/httpClient'
import type { FiltrosTablero, IngresosEgresosResponse } from '../types/tablero.types'

export const TABLERO_QUERY_KEYS = {
  INGRESOS_EGRESOS: (filtros: FiltrosTablero | null) =>
    ['tablero', 'ingresos-egresos', filtros] as const,
}

/**
 * GET /tablero/ingresos-egresos. El `signal` viene de React Query: al cambiar
 * los filtros, el request anterior se aborta y no puede pisar al nuevo.
 */
export async function obtenerIngresosEgresos(
  filtros: FiltrosTablero,
  signal?: AbortSignal
): Promise<IngresosEgresosResponse> {
  const { data } = await httpClient.get<IngresosEgresosResponse>('/tablero/ingresos-egresos', {
    params: {
      agrupacion: filtros.agrupacion,
      fechaDesde: filtros.fechaDesde,
      fechaHasta: filtros.fechaHasta,
    },
    signal,
  })

  return data
}
