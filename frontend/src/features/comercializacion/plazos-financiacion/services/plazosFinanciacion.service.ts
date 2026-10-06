import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type {
  CrearPlazoFinanciacionPayload,
  EditarPlazoFinanciacionPayload,
  PlazoFinanciacion,
  PlazoFinanciacionAuditado,
  PlazoFinanciacionDetalle,
  PlazosFinanciacionQuery,
} from '../types/plazoFinanciacion.types'

export const PLAZOS_FINANCIACION_QUERY_KEYS = {
  LISTA: (filtros: PlazosFinanciacionQuery) => ['plazos-financiacion', 'lista', filtros] as const,
  DETALLE: (id: number | null) => ['plazos-financiacion', 'detalle', id] as const,
}

/**
 * GET /plazos-financiacion — ordenado por cantidad de cuotas ascendente. El
 * `signal` viene de React Query: cuando cambian los filtros, el request
 * anterior se aborta y no puede pisar al nuevo.
 *
 * Ojo con el default: omitir `estado` **no** trae todos, trae solo los
 * activos. Para ver activos e inactivos juntos hay que mandar `'todos'`.
 */
export async function listarPlazosFinanciacion(
  filtros: PlazosFinanciacionQuery,
  signal?: AbortSignal
): Promise<PaginatedResponse<PlazoFinanciacion>> {
  const { data } = await httpClient.get<PaginatedResponse<PlazoFinanciacion>>(
    '/plazos-financiacion',
    {
      params: { estado: filtros.estado, page: filtros.page, limit: filtros.limit },
      signal,
    }
  )

  return data
}

/** GET /plazos-financiacion/:id — el plazo con su auditoría, para el modo lectura. */
export async function obtenerPlazoFinanciacion(
  id: number,
  signal?: AbortSignal
): Promise<PlazoFinanciacionDetalle> {
  const { data } = await httpClient.get<PlazoFinanciacionDetalle>(`/plazos-financiacion/${id}`, {
    signal,
  })

  return data
}

/** POST /plazos-financiacion — el alta es el único lugar donde se define la cantidad de cuotas. */
export async function crearPlazoFinanciacion(
  payload: CrearPlazoFinanciacionPayload
): Promise<PlazoFinanciacionAuditado> {
  const { data } = await httpClient.post<PlazoFinanciacionAuditado>('/plazos-financiacion', payload)
  return data
}

/** PATCH /plazos-financiacion/:id — solo TNA y descripción. */
export async function editarPlazoFinanciacion(
  id: number,
  payload: EditarPlazoFinanciacionPayload
): Promise<PlazoFinanciacionAuditado> {
  const { data } = await httpClient.patch<PlazoFinanciacionAuditado>(
    `/plazos-financiacion/${id}`,
    payload
  )
  return data
}

/** PATCH /plazos-financiacion/:id/baja — baja lógica. Sin body. */
export async function darDeBajaPlazoFinanciacion(id: number): Promise<PlazoFinanciacionAuditado> {
  const { data } = await httpClient.patch<PlazoFinanciacionAuditado>(
    `/plazos-financiacion/${id}/baja`
  )
  return data
}

/** PATCH /plazos-financiacion/:id/alta — alta lógica. Sin body. */
export async function reactivarPlazoFinanciacion(id: number): Promise<PlazoFinanciacionAuditado> {
  const { data } = await httpClient.patch<PlazoFinanciacionAuditado>(
    `/plazos-financiacion/${id}/alta`
  )
  return data
}
