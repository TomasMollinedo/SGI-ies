import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type {
  CrearUnidadFuncionalPayload,
  EditarUnidadFuncionalPayload,
  TipologiaCatalogoItem,
  UnidadFuncionalDetalle,
  UnidadFuncionalListItem,
  UnidadesFuncionalesQuery,
} from '../types/unidadFuncional.types'

export const UNIDADES_FUNCIONALES_QUERY_KEYS = {
  LISTA: (filtros: UnidadesFuncionalesQuery) => ['unidades-funcionales', 'lista', filtros] as const,
  DETALLE: (id: number | null) => ['unidades-funcionales', 'detalle', id] as const,
  TIPOLOGIAS: ['unidades-funcionales', 'tipologias'] as const,
}

/** GET /unidades-funcionales/tipologias — catálogo para el `<select>` de tipología. */
export async function listarTipologias(signal?: AbortSignal): Promise<TipologiaCatalogoItem[]> {
  const { data } = await httpClient.get<TipologiaCatalogoItem[]>(
    '/unidades-funcionales/tipologias',
    { signal }
  )
  return data
}

/**
 * GET /unidades-funcionales. El `signal` viene de React Query: cuando cambian
 * los filtros, el request anterior se aborta y no puede pisar al nuevo.
 */
export async function listarUnidadesFuncionales(
  filtros: UnidadesFuncionalesQuery,
  signal?: AbortSignal
): Promise<PaginatedResponse<UnidadFuncionalListItem>> {
  const { data } = await httpClient.get<PaginatedResponse<UnidadFuncionalListItem>>(
    '/unidades-funcionales',
    {
      params: {
        FK_proyecto: filtros.FK_proyecto,
        tipologia: filtros.tipologia,
        superficie_min: filtros.superficie_min,
        superficie_max: filtros.superficie_max,
        estado: filtros.estado,
        page: filtros.page,
        limit: filtros.limit,
      },
      signal,
    }
  )

  return data
}

/** GET /unidades-funcionales/:id — cabecera completa, galería y trazabilidad. */
export async function obtenerUnidadFuncional(
  id: number,
  signal?: AbortSignal
): Promise<UnidadFuncionalDetalle> {
  const { data } = await httpClient.get<UnidadFuncionalDetalle>(`/unidades-funcionales/${id}`, {
    signal,
  })
  return data
}

export async function crearUnidadFuncional(
  payload: CrearUnidadFuncionalPayload
): Promise<UnidadFuncionalDetalle> {
  const { data } = await httpClient.post<UnidadFuncionalDetalle>('/unidades-funcionales', payload)
  return data
}

export async function editarUnidadFuncional(
  id: number,
  payload: EditarUnidadFuncionalPayload
): Promise<UnidadFuncionalDetalle> {
  const { data } = await httpClient.patch<UnidadFuncionalDetalle>(
    `/unidades-funcionales/${id}`,
    payload
  )
  return data
}

/**
 * PATCH /unidades-funcionales/:id/baja — baja lógica, sin body.
 *
 * VERIFICAR contra Swagger: se asume que devuelve el mismo detalle que el
 * resto de las operaciones. Ver README-integracion.md, sección 2.
 */
export async function darDeBajaUnidadFuncional(id: number): Promise<UnidadFuncionalDetalle> {
  const { data } = await httpClient.patch<UnidadFuncionalDetalle>(`/unidades-funcionales/${id}/baja`)
  return data
}

/**
 * PATCH /unidades-funcionales/:id/alta — reactivación, sin body.
 *
 * VERIFICAR contra Swagger: ídem baja.
 */
export async function reactivarUnidadFuncional(id: number): Promise<UnidadFuncionalDetalle> {
  const { data } = await httpClient.patch<UnidadFuncionalDetalle>(`/unidades-funcionales/${id}/alta`)
  return data
}

/** POST /unidades-funcionales/:id/imagenes — asocia una imagen ya subida (con su URL pública) a la galería. */
export async function agregarImagenUnidadFuncional(
  id: number,
  payload: { url: string; orden?: number }
): Promise<UnidadFuncionalDetalle> {
  const { data } = await httpClient.post<UnidadFuncionalDetalle>(
    `/unidades-funcionales/${id}/imagenes`,
    payload
  )
  return data
}

/** PATCH /unidades-funcionales/:id/imagenes/orden — la lista COMPLETA de ids de la galería, en el orden nuevo. */
export async function ordenarImagenesUnidadFuncional(
  id: number,
  idsImagenUnidad: number[]
): Promise<UnidadFuncionalDetalle> {
  const { data } = await httpClient.patch<UnidadFuncionalDetalle>(
    `/unidades-funcionales/${id}/imagenes/orden`,
    { ids_imagen_unidad: idsImagenUnidad }
  )
  return data
}

/**
 * DELETE /unidades-funcionales/:id/imagenes/:idImagen — borrado físico (la
 * galería no tiene baja lógica).
 *
 * VERIFICAR contra Swagger: se asume que devuelve el detalle actualizado.
 */
export async function quitarImagenUnidadFuncional(
  id: number,
  idImagen: number
): Promise<UnidadFuncionalDetalle> {
  const { data } = await httpClient.delete<UnidadFuncionalDetalle>(
    `/unidades-funcionales/${id}/imagenes/${idImagen}`
  )
  return data
}
