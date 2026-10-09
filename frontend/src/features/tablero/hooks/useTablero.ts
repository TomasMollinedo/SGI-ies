import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import {
  TABLERO_QUERY_KEYS,
  obtenerIngresosEgresos,
  obtenerIngresosPorCliente,
} from '../services/tablero.service'
import type { FiltrosTablero, IngresosEgresosResponse, Ranking } from '../types/tablero.types'
import { rankingClientes } from '../utils/ranking'

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

/**
 * Ranking de los clientes que más aportaron en el rango. Mismos filtros que
 * `useIngresosEgresos`, pero en una consulta aparte: si falla, el resto del
 * tablero sigue en pantalla.
 */
export function useIngresosPorCliente(filtros: FiltrosTablero | null) {
  return useQuery<Ranking, ApiErrorResponse>({
    queryKey: TABLERO_QUERY_KEYS.INGRESOS_POR_CLIENTE(filtros),
    queryFn: async ({ signal }) => {
      const resumen = await obtenerIngresosPorCliente(filtros as FiltrosTablero, signal)

      return resumen
        ? { items: rankingClientes(resumen), totalIngresos: resumen.totalIngresos }
        : { items: [], totalIngresos: 0 }
    },
    enabled: filtros !== null,
    placeholderData: keepPreviousData,
  })
}
