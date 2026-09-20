import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import { PROYECTOS_QUERY_KEYS, listarProyectos } from '../services/proyectos.service'
import type { ProyectoResumen, ProyectosQuery } from '../types/proyecto.types'

/**
 * Listado paginado de proyectos, pensado para alimentar combos con búsqueda.
 * Con `retry: false` un endpoint inexistente falla una sola vez y el combo se
 * queda sin opciones en vez de reintentar en loop.
 *
 * CONTRATO PROVISIONAL: confirmar con el módulo de Proyectos
 */
export function useProyectos(filtros: ProyectosQuery, opciones?: { enabled?: boolean }) {
  return useQuery<PaginatedResponse<ProyectoResumen>, ApiErrorResponse>({
    queryKey: PROYECTOS_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarProyectos(filtros, signal),
    placeholderData: keepPreviousData,
    enabled: opciones?.enabled ?? true,
    retry: false,
  })
}
