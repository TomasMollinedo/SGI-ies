import { useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { CATEGORIAS_QUERY_KEYS, listarCategorias } from '../services/categorias.service'
import type { CategoriasPaginadas, FiltrosCategorias } from '../types/categoria.types'

export function useCategorias(filtros: FiltrosCategorias) {
  return useQuery<CategoriasPaginadas, ApiErrorResponse>({
    queryKey: CATEGORIAS_QUERY_KEYS.list(filtros),
    queryFn: () => listarCategorias(filtros),
  })
}
