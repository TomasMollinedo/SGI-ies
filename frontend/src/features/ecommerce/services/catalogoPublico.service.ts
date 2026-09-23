import { httpClientCliente } from '@/shared/api/httpClientCliente'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type {
  FiltrosCatalogo,
  ProyectosDestacadosResponse,
  UnidadCatalogo,
} from '../types/catalogoPublico.types'

export const CATALOGO_PUBLICO_QUERY_KEYS = {
  DESTACADOS: ['catalogo-publico', 'destacados'] as const,
  LISTA: (filtros: FiltrosCatalogo) => ['catalogo-publico', 'lista', filtros] as const,
}

/**
 * GET /catalogo (T107): las unidades disponibles para la venta, paginadas.
 *
 * Los filtros vacíos no se mandan: axios omite los `undefined`, así que la URL
 * queda con los parámetros que el visitante realmente eligió.
 */
export async function listarCatalogo(
  filtros: FiltrosCatalogo,
  signal?: AbortSignal
): Promise<PaginatedResponse<UnidadCatalogo>> {
  const { data } = await httpClientCliente.get<PaginatedResponse<UnidadCatalogo>>('/catalogo', {
    params: {
      FK_proyecto: filtros.FK_proyecto,
      tipologia: filtros.tipologia,
      entregada: filtros.entregada,
      page: filtros.page,
      limit: filtros.limit,
    },
    signal,
  })

  return data
}

/**
 * GET /catalogo/destacados (T107): los proyectos con más unidades disponibles,
 * para la landing. El endpoint es público (`@Public()`), pero va por el cliente
 * del ecommerce igual que el resto del dominio público — si hay sesión de
 * cliente el token viaja, y si no, la request sale sin Authorization.
 */
export async function obtenerProyectosDestacados(
  signal?: AbortSignal
): Promise<ProyectosDestacadosResponse> {
  const { data } = await httpClientCliente.get<ProyectosDestacadosResponse>(
    '/catalogo/destacados',
    {
      signal,
    }
  )

  return data
}
