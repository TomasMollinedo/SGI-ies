import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'

/**
 * Fila mínima de GET /articulos, solo lo que necesita el buscador de artículo
 * del alta de stock. El módulo de Artículos todavía no existe en el frontend
 * (ver T16): cuando se implemente su CRUD completo, este archivo se reemplaza
 * por ese feature.
 */
export interface ArticuloBusqueda {
  id_articulo: number
  codigo: string
  nombre: string
}

export const ARTICULOS_LOOKUP_QUERY_KEYS = {
  BUSQUEDA: (busqueda: string) => ['articulos', 'busqueda', busqueda] as const,
}

/**
 * Busca artículos activos por código o nombre, para el combobox de alta de
 * stock. Devuelve la respuesta paginada completa (no solo `data`) para poder
 * avisar en el combobox cuando hay más resultados que los 10 traídos.
 */
export async function buscarArticulos(
  busqueda: string
): Promise<PaginatedResponse<ArticuloBusqueda>> {
  const { data } = await httpClient.get<PaginatedResponse<ArticuloBusqueda>>('/articulos', {
    params: { busqueda, estado: true, limit: 10 },
  })
  return data
}
