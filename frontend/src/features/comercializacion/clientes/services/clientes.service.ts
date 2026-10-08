import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type {
  ClienteFicha,
  ClienteListItem,
  ClientesQuery,
  EditarClientePayload,
} from '../types/cliente.types'

export const CLIENTES_QUERY_KEYS = {
  LISTA: (filtros: ClientesQuery) => ['clientes', 'lista', filtros] as const,
  DETALLE: (id: number | null) => ['clientes', 'detalle', id] as const,
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

/** GET /clientes/:id — la ficha completa, con sus cinco secciones. */
export async function obtenerClienteFicha(id: number, signal?: AbortSignal): Promise<ClienteFicha> {
  const { data } = await httpClient.get<ClienteFicha>(`/clientes/${id}`, { signal })
  return data
}

/**
 * PATCH /clientes/:id — modo EDICIÓN de la ficha.
 *
 * Devuelve la ficha completa ya actualizada, así que no hace falta volver a
 * pedirla: la respuesta se mete directo en la cache (ver `useEditarCliente`).
 */
export async function editarCliente(
  id: number,
  payload: EditarClientePayload
): Promise<ClienteFicha> {
  const { data } = await httpClient.patch<ClienteFicha>(`/clientes/${id}`, payload)
  return data
}
