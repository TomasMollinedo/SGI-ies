import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  UNIDADES_FUNCIONALES_QUERY_KEYS,
  listarUnidadesFuncionales,
} from '../services/unidadesFuncionales.service'
import type { UnidadesFuncionalesQuery, UnidadFuncionalResumen } from '../services/unidadesFuncionales.service'

/** Unidades de un proyecto, para el filtro cascadeado del listado de ventas. */
export function useUnidadesFuncionales(
  filtros: UnidadesFuncionalesQuery,
  opciones?: { enabled?: boolean }
) {
  return useQuery<PaginatedResponse<UnidadFuncionalResumen>, ApiErrorResponse>({
    queryKey: UNIDADES_FUNCIONALES_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarUnidadesFuncionales(filtros, signal),
    placeholderData: keepPreviousData,
    enabled: opciones?.enabled ?? true,
  })
}
