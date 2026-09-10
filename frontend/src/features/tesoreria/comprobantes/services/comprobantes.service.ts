import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type { ComprobanteListItem, ComprobantesQuery } from '../types/comprobante.types'

export const COMPROBANTES_QUERY_KEYS = {
  LISTA: (filtros: ComprobantesQuery) => ['comprobantes', 'lista', filtros] as const,
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