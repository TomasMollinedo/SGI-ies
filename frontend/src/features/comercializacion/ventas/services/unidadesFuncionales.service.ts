import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'

export interface UnidadFuncionalResumen {
  id_unidad_funcional: number
  identificador: string
}

export interface UnidadesFuncionalesQuery {
  FK_proyecto: number
  limit?: number
}

export const UNIDADES_FUNCIONALES_QUERY_KEYS = {
  LISTA: (filtros: UnidadesFuncionalesQuery) => ['unidades-funcionales', 'lista', filtros] as const,
}

/**
 * GET /unidades-funcionales, acotado a lo que necesita el filtro de unidad
 * del listado de ventas: siempre con `FK_proyecto` (evita traer todas las
 * unidades del sistema — ese endpoint no tiene búsqueda por texto) y
 * `estado: todos` (una unidad vendida puede haberse dado de baja después y
 * tiene que poder seguir filtrándose).
 */
export async function listarUnidadesFuncionales(
  filtros: UnidadesFuncionalesQuery,
  signal?: AbortSignal
): Promise<PaginatedResponse<UnidadFuncionalResumen>> {
  const { data } = await httpClient.get<PaginatedResponse<UnidadFuncionalResumen>>(
    '/unidades-funcionales',
    {
      params: { FK_proyecto: filtros.FK_proyecto, estado: 'todos', limit: filtros.limit },
      signal,
    }
  )

  return data
}
