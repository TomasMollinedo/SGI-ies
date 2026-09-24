import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  CONSULTAS_QUERY_KEYS,
  listarConsultas,
  responderConsulta,
} from '../services/consultas.service'
import type {
  ConsultaInterna,
  ConsultasQuery,
  ResponderConsultaPayload,
} from '../types/consulta.types'

/** Cola de trabajo paginada, con los filtros combinados que soporta el backend. */
export function useConsultas(filtros: ConsultasQuery) {
  return useQuery<PaginatedResponse<ConsultaInterna>, ApiErrorResponse>({
    queryKey: CONSULTAS_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarConsultas(filtros, signal),
    placeholderData: keepPreviousData,
  })
}

export function useResponderConsulta() {
  const queryClient = useQueryClient()

  return useMutation<
    ConsultaInterna,
    ApiErrorResponse,
    { id: number; payload: ResponderConsultaPayload }
  >({
    mutationFn: ({ id, payload }) => responderConsulta(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultas', 'lista'] })
    },
  })
}