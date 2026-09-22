import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type { ProyectoResumen, ProyectosQuery } from '../types/proyecto.types'

export const PROYECTOS_QUERY_KEYS = {
  LISTA: (filtros: ProyectosQuery) => ['proyectos', 'lista', filtros] as const,
}

/**
 * GET /proyectos. Único punto de contacto con el endpoint de Proyectos: lo usan
 * los combos de proyecto de Comercialización, y el módulo de Proyectos puede
 * reclamarlo cuando exista.
 *
 * CONTRATO PROVISIONAL: confirmar con el módulo de Proyectos
 */
export async function listarProyectos(
  filtros: ProyectosQuery,
  signal?: AbortSignal
): Promise<PaginatedResponse<ProyectoResumen>> {
  const { data } = await httpClient.get<PaginatedResponse<ProyectoResumen>>('/proyectos', {
    params: { busqueda: filtros.busqueda, page: filtros.page, limit: filtros.limit },
    signal,
  })

  return data
}
