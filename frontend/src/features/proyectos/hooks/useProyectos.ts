import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import { PROYECTOS_QUERY_KEYS, listarProyectos, obtenerProyecto } from '../services/proyectos.service'
import type { ProyectoDetalle, ProyectoResumen, ProyectosQuery } from '../types/proyecto.types'

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

/**
 * Detalle de un proyecto: presupuesto y unidades cargadas/planificadas
 * incluidos (T102). Con `id` en `null` la query queda deshabilitada.
 *
 * CONTRATO PROVISIONAL: confirmar con el módulo de Proyectos
 */
export function useProyectoDetalle(id: number | null) {
  return useQuery<ProyectoDetalle, ApiErrorResponse>({
    queryKey: PROYECTOS_QUERY_KEYS.DETALLE(id),
    queryFn: ({ signal }) => obtenerProyecto(id!, signal),
    enabled: id !== null,
    retry: false,
  })
}