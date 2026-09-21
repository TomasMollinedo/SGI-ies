import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type {
  CrearPublicacionPayload,
  DespublicarPublicacionPayload,
  PublicacionDetalle,
  PublicacionListItem,
  PublicacionesQuery,
  UnidadPublicable,
  UnidadesPublicablesQuery,
} from '../types/publicacion.types'

export const PUBLICACIONES_QUERY_KEYS = {
  LISTA: (filtros: PublicacionesQuery) => ['publicaciones', 'lista', filtros] as const,
  DETALLE: (id: number | null) => ['publicaciones', 'detalle', id] as const,
  UNIDADES_PUBLICABLES: (filtros: UnidadesPublicablesQuery) =>
    ['publicaciones', 'unidades-publicables', filtros] as const,
}

/**
 * GET /publicaciones. `vigente` viaja como `'true'`/`'false'` porque el backend
 * lo valida como enum de strings. El orden lo define el backend (fecha de
 * publicación descendente).
 */
export async function listarPublicaciones(
  filtros: PublicacionesQuery,
  signal?: AbortSignal
): Promise<PaginatedResponse<PublicacionListItem>> {
  const { data } = await httpClient.get<PaginatedResponse<PublicacionListItem>>('/publicaciones', {
    params: {
      vigente: filtros.vigente === undefined ? undefined : String(filtros.vigente),
      estado_comercial: filtros.estado_comercial,
      FK_proyecto: filtros.FK_proyecto,
      tipologia: filtros.tipologia,
      page: filtros.page,
      limit: filtros.limit,
    },
    signal,
  })

  return data
}

/** GET /publicaciones/unidades-publicables — unidades sin publicación vigente, para la tabla emergente. */
export async function listarUnidadesPublicables(
  filtros: UnidadesPublicablesQuery,
  signal?: AbortSignal
): Promise<PaginatedResponse<UnidadPublicable>> {
  const { data } = await httpClient.get<PaginatedResponse<UnidadPublicable>>(
    '/publicaciones/unidades-publicables',
    {
      params: {
        FK_proyecto: filtros.FK_proyecto,
        tipologia: filtros.tipologia,
        page: filtros.page,
        limit: filtros.limit,
      },
      signal,
    }
  )

  return data
}

/** POST /publicaciones — la publicación nace en EN_PREPARACION. */
export async function crearPublicacion(
  payload: CrearPublicacionPayload
): Promise<PublicacionDetalle> {
  const { data } = await httpClient.post<PublicacionDetalle>('/publicaciones', payload)
  return data
}

/** GET /publicaciones/:id — detalle con unidad, imágenes, proyecto y condición de entrega. */
export async function obtenerPublicacion(
  id: number,
  signal?: AbortSignal
): Promise<PublicacionDetalle> {
  const { data } = await httpClient.get<PublicacionDetalle>(`/publicaciones/${id}`, { signal })
  return data
}

/** PATCH /publicaciones/:id/despublicar — solo en EN_PREPARACION o DISPONIBLE, con motivo. */
export async function despublicarPublicacion(
  id: number,
  payload: DespublicarPublicacionPayload
): Promise<PublicacionDetalle> {
  const { data } = await httpClient.patch<PublicacionDetalle>(
    `/publicaciones/${id}/despublicar`,
    payload
  )
  return data
}
