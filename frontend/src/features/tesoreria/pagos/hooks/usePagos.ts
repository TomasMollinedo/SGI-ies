import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { PAGOS_QUERY_KEYS, listarPagos } from '../services/pagos.service'
import type { PagosListResponse, PagosQuery } from '../types/pago.types'

/**
 * Listado paginado de pagos. Cada combinación de filtros es su propia entrada
 * de cache, así que una respuesta vieja nunca puede pisar a la actual.
 *
 * `keepPreviousData` mantiene el paginador (y el resumen del período) en
 * pantalla mientras llega la página siguiente: sin eso, `meta` desaparecería y
 * el pie de la tabla saltaría.
 */
export function usePagos(filtros: PagosQuery) {
  return useQuery<PagosListResponse, ApiErrorResponse>({
    queryKey: PAGOS_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarPagos(filtros, signal),
    placeholderData: keepPreviousData,
  })
}
