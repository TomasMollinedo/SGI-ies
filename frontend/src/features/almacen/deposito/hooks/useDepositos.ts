import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import { DEPOSITOS_QUERY_KEYS, listarDepositos } from '../services/depositos.service'
import type { Deposito, FiltrosDepositos } from '../types/deposito.types'

/** placeholderData: keepPreviousData evita el flash de loading al cambiar de página o filtro. */
export function useDepositos(filtros: FiltrosDepositos) {
  return useQuery<PaginatedResponse<Deposito>, ApiErrorResponse>({
    queryKey: DEPOSITOS_QUERY_KEYS.LISTA(filtros),
    queryFn: () => listarDepositos(filtros),
    placeholderData: keepPreviousData,
  })
}
