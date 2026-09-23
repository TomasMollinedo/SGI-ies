import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  CATALOGO_PUBLICO_QUERY_KEYS,
  listarCatalogo,
} from '@/features/ecommerce/services/catalogoPublico.service'
import type {
  FiltrosCatalogo,
  UnidadCatalogo,
} from '@/features/ecommerce/types/catalogoPublico.types'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'

/**
 * Listado del catálogo público. `keepPreviousData` deja la grilla anterior a la
 * vista mientras llega la página nueva, para que no parpadee al paginar o al
 * cambiar un filtro.
 */
export function useCatalogo(filtros: FiltrosCatalogo) {
  return useQuery<PaginatedResponse<UnidadCatalogo>, ApiErrorResponse>({
    queryKey: CATALOGO_PUBLICO_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarCatalogo(filtros, signal),
    placeholderData: keepPreviousData,
  })
}
