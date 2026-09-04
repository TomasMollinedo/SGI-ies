import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type {
  CrearTipoComprobantePayload,
  EditarTipoComprobantePayload,
  TipoComprobante,
  TipoComprobanteAuditado,
  TipoComprobanteDetalle,
  TiposComprobanteQuery,
} from '../types/tipoComprobante.types'

export const TIPOS_COMPROBANTE_QUERY_KEYS = {
  LISTA: (filtros: TiposComprobanteQuery) => ['tipos-comprobante', 'lista', filtros] as const,
  DETALLE: (id: number | null) => ['tipos-comprobante', 'detalle', id] as const,
}

/**
 * GET /tipos-comprobante. El `signal` viene de React Query: cuando cambian los
 * filtros, el request anterior se aborta y no puede pisar al nuevo.
 *
 * `estado` y `aumenta_saldo` viajan como `'true'`/`'false'` porque el backend
 * los valida como enum de strings, no como booleanos. Los que quedan en
 * `undefined` axios no los manda, y sin ellos el backend no filtra: trae los
 * activos y los dados de baja, y los que aumentan y los que disminuyen el saldo.
 */
export async function listarTiposComprobante(
  filtros: TiposComprobanteQuery,
  signal?: AbortSignal
): Promise<PaginatedResponse<TipoComprobante>> {
  const { data } = await httpClient.get<PaginatedResponse<TipoComprobante>>('/tipos-comprobante', {
    params: {
      nombre: filtros.nombre,
      estado: filtros.estado === undefined ? undefined : String(filtros.estado),
      aumenta_saldo: filtros.aumentaSaldo === undefined ? undefined : String(filtros.aumentaSaldo),
      page: filtros.page,
      limit: filtros.limit,
    },
    signal,
  })

  return data
}

/**
 * GET /tipos-comprobante/:id — el tipo de comprobante con su trazabilidad,
 * para el modal de detalle. El id es el `id_tipo_comprobante`, no el código
 * formateado.
 */
export async function obtenerTipoComprobante(
  id: number,
  signal?: AbortSignal
): Promise<TipoComprobanteDetalle> {
  const { data } = await httpClient.get<TipoComprobanteDetalle>(`/tipos-comprobante/${id}`, {
    signal,
  })

  return data
}

/**
 * POST /tipos-comprobante — el alta es el único lugar donde se definen el
 * efecto sobre el saldo y si requiere comprobante de origen.
 */
export async function crearTipoComprobante(
  payload: CrearTipoComprobantePayload
): Promise<TipoComprobanteAuditado> {
  const { data } = await httpClient.post<TipoComprobanteAuditado>('/tipos-comprobante', payload)
  return data
}

/** PATCH /tipos-comprobante/:id — solo nombre y descripción; los indicadores no viajan nunca. */
export async function editarTipoComprobante(
  id: number,
  payload: EditarTipoComprobantePayload
): Promise<TipoComprobanteAuditado> {
  const { data } = await httpClient.patch<TipoComprobanteAuditado>(
    `/tipos-comprobante/${id}`,
    payload
  )
  return data
}

/** PATCH /tipos-comprobante/:id/baja — baja lógica. Sin body; devuelve el tipo ya actualizado. */
export async function darDeBajaTipoComprobante(id: number): Promise<TipoComprobanteAuditado> {
  const { data } = await httpClient.patch<TipoComprobanteAuditado>(`/tipos-comprobante/${id}/baja`)
  return data
}

/** PATCH /tipos-comprobante/:id/alta — alta lógica. Sin body; devuelve el tipo ya actualizado. */
export async function reactivarTipoComprobante(id: number): Promise<TipoComprobanteAuditado> {
  const { data } = await httpClient.patch<TipoComprobanteAuditado>(`/tipos-comprobante/${id}/alta`)
  return data
}
