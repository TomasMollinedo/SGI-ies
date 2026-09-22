import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type { ProyectoDetalle, ProyectoResumen, ProyectosQuery } from '../types/proyecto.types'

export const PROYECTOS_QUERY_KEYS = {
  LISTA: (filtros: ProyectosQuery) => ['proyectos', 'lista', filtros] as const,
  DETALLE: (id: number | null) => ['proyectos', 'detalle', id] as const,
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

/**
 * GET /proyectos/:id — el proyecto con su presupuesto y el contador de
 * unidades cargadas contra planificadas, calculados por el backend (T102).
 *
 * CONTRATO PROVISIONAL: confirmar con el módulo de Proyectos
 */
export async function obtenerProyecto(id: number, signal?: AbortSignal): Promise<ProyectoDetalle> {
  const { data } = await httpClient.get<ProyectoDetalle>(`/proyectos/${id}`, { signal })
  return data
}
