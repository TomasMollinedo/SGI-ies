import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import { CLIENTES_QUERY_KEYS, listarClientes } from '../services/clientes.service'
import type { ClienteListItem, ClientesQuery } from '../types/cliente.types'

/**
 * Listado paginado de clientes (HU-33). Cada combinación de filtros es su
 * propia entrada de cache, así que una respuesta vieja nunca puede pisar a la
 * actual.
 *
 * `keepPreviousData` mantiene el paginador en pantalla mientras llega la
 * página siguiente: sin eso, `meta` desaparecería y el pie de la tabla saltaría.
 */
export function useClientes(filtros: ClientesQuery) {
  return useQuery<PaginatedResponse<ClienteListItem>, ApiErrorResponse>({
    queryKey: CLIENTES_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarClientes(filtros, signal),
    placeholderData: keepPreviousData,
  })
}
