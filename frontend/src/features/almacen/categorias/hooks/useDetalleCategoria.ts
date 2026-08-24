import { useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { CATEGORIAS_QUERY_KEYS, obtenerCategoria } from '../services/categorias.service'
import type { CategoriaDetalle } from '../types/categoria.types'

export function useDetalleCategoria(id: number) {
  return useQuery<CategoriaDetalle, ApiErrorResponse>({
    queryKey: CATEGORIAS_QUERY_KEYS.detail(id),
    queryFn: () => obtenerCategoria(id),
  })
}
