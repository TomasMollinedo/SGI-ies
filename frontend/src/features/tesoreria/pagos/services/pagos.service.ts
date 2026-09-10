import { httpClient } from '@/shared/api/httpClient'
import type {
  AnularPagoPayload,
  ComprobantesImputablesResponse,
  CrearPagoPayload,
  PagoDetalle,
  PagosListResponse,
  PagosQuery,
} from '../types/pago.types'

export const PAGOS_QUERY_KEYS = {
  LISTA: (filtros: PagosQuery) => ['pagos', 'lista', filtros] as const,
  COMPROBANTES_IMPUTABLES: (FK_proveedor: number) =>
    ['pagos', 'comprobantes-imputables', FK_proveedor] as const,
  DETALLE: (id: number | null) => ['pagos', 'detalle', id] as const,
}

/**
 * GET /pagos. El `signal` viene de React Query: cuando cambian los filtros, el
 * request anterior se aborta y no puede pisar al nuevo.
 *
 * Los filtros en `undefined` axios no los manda, y sin ellos el backend no
 * filtra. `resumenPeriodo` viene en `null` salvo que `fechaDesde` y
 * `fechaHasta` viajen juntas — eso ya lo decide el backend, acá no hay nada
 * especial que hacer.
 */
export async function listarPagos(
  filtros: PagosQuery,
  signal?: AbortSignal
): Promise<PagosListResponse> {
  const { data } = await httpClient.get<PagosListResponse>('/pagos', {
    params: {
      FK_proveedor: filtros.FK_proveedor,
      FK_forma_pago: filtros.FK_forma_pago,
      estado: filtros.estado,
      fechaDesde: filtros.fechaDesde,
      fechaHasta: filtros.fechaHasta,
      page: filtros.page,
      limit: filtros.limit,
    },
    signal,
  })

  return data
}

/**
 * GET /pagos/comprobantes-imputables: los comprobantes REGISTRADOS con saldo
 * pendiente > 0 de un proveedor (facturas y notas de crédito), para armar el
 * detalle del formulario de emisión de un pago. Sin paginar.
 */
export async function listarComprobantesImputables(
  FK_proveedor: number,
  signal?: AbortSignal
): Promise<ComprobantesImputablesResponse> {
  const { data } = await httpClient.get<ComprobantesImputablesResponse>(
    '/pagos/comprobantes-imputables',
    { params: { FK_proveedor }, signal }
  )

  return data
}

/** POST /pagos: confirma un pago imputado a uno o más comprobantes. Nace siempre CONFIRMADA. */
export async function crearPago(payload: CrearPagoPayload): Promise<PagoDetalle> {
  const { data } = await httpClient.post<PagoDetalle>('/pagos', payload)

  return data
}

/** GET /pagos/:id: cabecera completa + el detalle de imputaciones de un pago. */
export async function obtenerPago(id: number, signal?: AbortSignal): Promise<PagoDetalle> {
  const { data } = await httpClient.get<PagoDetalle>(`/pagos/${id}`, { signal })

  return data
}

/** PATCH /pagos/:id/anular: restituye el saldo pendiente de cada comprobante imputado. */
export async function anularPago(id: number, payload: AnularPagoPayload): Promise<PagoDetalle> {
  const { data } = await httpClient.patch<PagoDetalle>(`/pagos/${id}/anular`, payload)

  return data
}
