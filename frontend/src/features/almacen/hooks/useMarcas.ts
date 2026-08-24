import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import { listarMarcas, MARCAS_QUERY_KEYS } from '../services/marcas.service'
import type { Marca, MarcasQuery } from '../types/marca.types'

/**
 * Listado paginado de marcas. Cada combinación de filtros es su propia entrada
 * de cache, así que una respuesta vieja nunca puede pisar a la actual.
 *
 * `keepPreviousData` mantiene el paginador en pantalla mientras llega la página
 * siguiente: sin eso, `meta` desaparecería y el pie de la tabla saltaría.
 */
export function useMarcas(filtros: MarcasQuery) {
  return useQuery<PaginatedResponse<Marca>, ApiErrorResponse>({
    queryKey: MARCAS_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarMarcas(filtros, signal),
    placeholderData: keepPreviousData,
  })
}
