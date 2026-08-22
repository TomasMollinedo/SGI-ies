import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type { Deposito, FiltrosDepositos } from '../types/deposito.types'

export const DEPOSITOS_QUERY_KEYS = {
  LISTA: (filtros: FiltrosDepositos) => ['depositos', 'lista', filtros] as const,
}

export async function listarDepositos(
  filtros: FiltrosDepositos
): Promise<PaginatedResponse<Deposito>> {
  const { data } = await httpClient.get<PaginatedResponse<Deposito>>('/depositos', {
    params: {
      nombre: filtros.nombre || undefined,
      estado: filtros.estado,
      es_obrador: filtros.esObrador,
      page: filtros.page,
      limit: filtros.limit,
    },
  })
  return data
}
