import { httpClient } from '@/shared/api/httpClient'
import type { PagosListResponse, PagosQuery } from '../types/pago.types'

export const PAGOS_QUERY_KEYS = {
  LISTA: (filtros: PagosQuery) => ['pagos', 'lista', filtros] as const,
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
      busquedaProveedor: filtros.busquedaProveedor,
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
