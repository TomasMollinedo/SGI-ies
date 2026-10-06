import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type { ClienteListItem, ClientesQuery } from '../types/cliente.types'

export const CLIENTES_QUERY_KEYS = {
  LISTA: (filtros: ClientesQuery) => ['clientes', 'lista', filtros] as const,
}

/**
 * GET /clientes. El `signal` viene de React Query: cuando cambian los
 * filtros, el request anterior se aborta y no puede pisar al nuevo.
 *
 * `con_compras` y `en_mora` viajan como `'true'`/`'false'` porque el backend
 * los valida como enum de strings, no como booleanos. Los que quedan en
 * `undefined` axios no los manda, y sin ellos el backend no filtra: trae
 * tanto los clientes con compras como los interesados, en mora y al día.
 */
export async function listarClientes(
  filtros: ClientesQuery,
  signal?: AbortSignal
): Promise<PaginatedResponse<ClienteListItem>> {
  const { data } = await httpClient.get<PaginatedResponse<ClienteListItem>>('/clientes', {
    params: {
      busqueda: filtros.busqueda,
      con_compras: filtros.conCompras === undefined ? undefined : String(filtros.conCompras),
      en_mora: filtros.enMora === undefined ? undefined : String(filtros.enMora),
      FK_proyecto: filtros.FK_proyecto,
      page: filtros.page,
      limit: filtros.limit,
    },
    signal,
  })

  return data
}
