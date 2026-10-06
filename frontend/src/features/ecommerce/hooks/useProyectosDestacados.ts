import { useQuery } from '@tanstack/react-query'
import {
  CATALOGO_PUBLICO_QUERY_KEYS,
  obtenerProyectosDestacados,
} from '@/features/ecommerce/services/catalogoPublico.service'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import type { ProyectosDestacadosResponse } from '@/features/ecommerce/types/catalogoPublico.types'

/**
 * Proyectos destacados de la landing (T107). La sección entera se oculta si
 * esto devuelve `[]` o falla, así que `retry: false`: un visitante sin
 * conexión al backend ve la landing completa menos esta sección, en vez de
 * quedarse mirando skeletons mientras se reintenta.
 */
export function useProyectosDestacados() {
  return useQuery<ProyectosDestacadosResponse, ApiErrorResponse>({
    queryKey: CATALOGO_PUBLICO_QUERY_KEYS.DESTACADOS,
    queryFn: ({ signal }) => obtenerProyectosDestacados(signal),
    retry: false,
  })
}
