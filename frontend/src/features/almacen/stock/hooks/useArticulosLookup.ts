import { useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import { ARTICULOS_LOOKUP_QUERY_KEYS, buscarArticulos } from '../services/articulos-lookup.service'
import type { ArticuloBusqueda } from '../services/articulos-lookup.service'

/** Busca artículos activos por código o nombre. Solo corre con 3+ caracteres, para no pedir de más mientras el usuario recién empieza a tipear. */
export function useArticulosLookup(busqueda: string) {
  return useQuery<PaginatedResponse<ArticuloBusqueda>, ApiErrorResponse>({
    queryKey: ARTICULOS_LOOKUP_QUERY_KEYS.BUSQUEDA(busqueda),
    queryFn: () => buscarArticulos(busqueda),
    enabled: busqueda.trim().length >= 3,
  })
}
