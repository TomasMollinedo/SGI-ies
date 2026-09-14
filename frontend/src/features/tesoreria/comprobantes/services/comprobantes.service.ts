import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type {
  AnularComprobantePayload,
  Comprobante,
  ComprobanteDetalle,
  ComprobanteListItem,
  ComprobantesQuery,
  CrearComprobantePayload,
  EditarComprobantePayload,
} from '../types/comprobante.types'

export const COMPROBANTES_QUERY_KEYS = {
  LISTA: (filtros: ComprobantesQuery) => ['comprobantes', 'lista', filtros] as const,
  DETALLE: (id: number | null) => ['comprobantes', 'detalle', id] as const,
}

/**
 * GET /comprobantes. El `signal` viene de React Query: cuando cambian los
 * filtros, el request anterior se aborta y no puede pisar al nuevo.
 *
 * `aumenta_saldo` viaja como `'true'`/`'false'` porque el backend lo valida como
 * enum de strings; los `undefined` axios no los manda, y sin ellos el backend no
 * filtra por ese criterio.
 */
export async function listarComprobantes(
  filtros: ComprobantesQuery,
  signal?: AbortSignal
): Promise<PaginatedResponse<ComprobanteListItem>> {
  const { data } = await httpClient.get<PaginatedResponse<ComprobanteListItem>>('/comprobantes', {
    params: {
      FK_proveedor: filtros.FK_proveedor,
      FK_tipo_comprobante: filtros.FK_tipo_comprobante,
      aumenta_saldo:
        filtros.aumentaSaldo === undefined ? undefined : String(filtros.aumentaSaldo),
      estado: filtros.estado,
      estado_saldo: filtros.estadoSaldo,
      fechaDesde: filtros.fechaDesde,
      fechaHasta: filtros.fechaHasta,
      page: filtros.page,
      limit: filtros.limit,
    },
    signal,
  })

  return data
}

/** POST /comprobantes — crea el comprobante en estado BORRADOR. */
export async function crearComprobante(payload: CrearComprobantePayload): Promise<Comprobante> {
  const { data } = await httpClient.post<Comprobante>('/comprobantes', payload)
  return data
}

/** PATCH /comprobantes/:id/confirmar — BORRADOR → REGISTRADO. Devuelve el comprobante ya registrado. */
export async function confirmarComprobante(id: number): Promise<Comprobante> {
  const { data } = await httpClient.patch<Comprobante>(`/comprobantes/${id}/confirmar`)
  return data
}

/** GET /comprobantes/:id — el comprobante con sus líneas y su trazabilidad, para el modal de detalle. */
export async function obtenerComprobante(
  id: number,
  signal?: AbortSignal
): Promise<ComprobanteDetalle> {
  const { data } = await httpClient.get<ComprobanteDetalle>(`/comprobantes/${id}`, { signal })
  return data
}

/** PATCH /comprobantes/:id — edita cabecera y/o detalle de un comprobante en BORRADOR. */
export async function editarComprobante(
  id: number,
  payload: EditarComprobantePayload
): Promise<Comprobante> {
  const { data } = await httpClient.patch<Comprobante>(`/comprobantes/${id}`, payload)
  return data
}

/** PATCH /comprobantes/:id/anular — anula un comprobante REGISTRADO, con motivo obligatorio. */
export async function anularComprobante(
  id: number,
  payload: AnularComprobantePayload
): Promise<Comprobante> {
  const { data } = await httpClient.patch<Comprobante>(`/comprobantes/${id}/anular`, payload)
  return data
}