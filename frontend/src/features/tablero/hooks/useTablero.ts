import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { TABLERO_QUERY_KEYS, obtenerIngresosEgresos } from '../services/tablero.service'
import type { FiltrosTablero, IngresosEgresosResponse } from '../types/tablero.types'

/**
 * Ingresos, egresos y resultado por período. `keepPreviousData` deja en
 * pantalla los indicadores y el gráfico anteriores mientras llegan los del
 * nuevo rango, para que la pantalla no salte con cada cambio de filtro.
 *
 * `filtros` en `null` cuando el rango que armó el usuario todavía no es
 * consultable (fecha vacía o invertida): no se pide nada y queda lo anterior.
 */
export function useIngresosEgresos(filtros: FiltrosTablero | null) {
  return useQuery<IngresosEgresosResponse, ApiErrorResponse>({
    queryKey: TABLERO_QUERY_KEYS.INGRESOS_EGRESOS(filtros),
    queryFn: ({ signal }) => obtenerIngresosEgresos(filtros as FiltrosTablero, signal),
    enabled: filtros !== null,
    placeholderData: keepPreviousData,
  })
}
