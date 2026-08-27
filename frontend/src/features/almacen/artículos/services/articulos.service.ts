import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type {
  Articulo,
  ArticuloAuditada,
  ArticuloDetalle,
  ArticulosQuery,
  CrearArticuloPayload,
  EditarArticuloPayload,
} from '../types/articulo.types'

export const ARTICULOS_QUERY_KEYS = {
  LISTA: (filtros: ArticulosQuery) => ['articulos', 'lista', filtros] as const,
  DETALLE: (id: number | null) => ['articulos', 'detalle', id] as const,
}

/**
 * GET /articulos. El `signal` viene de React Query: cuando cambian los filtros,
 * el request anterior se aborta y no puede pisar al nuevo.
 *
 * `estado` viaja como `'true'`/`'false'` porque el backend lo valida como enum
 * de strings, no como booleano.
 */
export async function listarArticulos(
  filtros: ArticulosQuery,
  signal?: AbortSignal
): Promise<PaginatedResponse<Articulo>> {
  const { data } = await httpClient.get<PaginatedResponse<Articulo>>('/articulos', {
    params: {
      busqueda: filtros.busqueda,
      FK_Categoria: filtros.FK_Categoria,
      FK_Marca: filtros.FK_Marca,
      estado: filtros.estado === undefined ? undefined : String(filtros.estado),
      page: filtros.page,
      limit: filtros.limit,
    },
    signal,
  })

  return data
}

/** GET /articulos/:id — el artículo con sus relaciones y su trazabilidad, para el modal de detalle. */
export async function obtenerArticulo(id: number, signal?: AbortSignal): Promise<ArticuloDetalle> {
  const { data } = await httpClient.get<ArticuloDetalle>(`/articulos/${id}`, { signal })
  return data
}

export async function crearArticulo(payload: CrearArticuloPayload): Promise<ArticuloAuditada> {
  const { data } = await httpClient.post<ArticuloAuditada>('/articulos', payload)
  return data
}

export async function editarArticulo(
  id: number,
  payload: EditarArticuloPayload
): Promise<ArticuloAuditada> {
  const { data } = await httpClient.patch<ArticuloAuditada>(`/articulos/${id}`, payload)
  return data
}

/** PATCH /articulos/:id/baja — baja lógica. Sin body; devuelve el artículo ya actualizado. */
export async function darDeBajaArticulo(id: number): Promise<ArticuloAuditada> {
  const { data } = await httpClient.patch<ArticuloAuditada>(`/articulos/${id}/baja`)
  return data
}

/** PATCH /articulos/:id/alta — alta lógica. Sin body; devuelve el artículo ya actualizado. */
export async function reactivarArticulo(id: number): Promise<ArticuloAuditada> {
  const { data } = await httpClient.patch<ArticuloAuditada>(`/articulos/${id}/alta`)
  return data
}
