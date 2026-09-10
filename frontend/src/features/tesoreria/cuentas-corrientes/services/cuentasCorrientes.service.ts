import { httpClient } from '@/shared/api/httpClient'
import type {
  CuentasCorrientesQuery,
  CuentasCorrientesResponse,
} from '../types/cuentaCorriente.types'

export const CUENTAS_CORRIENTES_QUERY_KEYS = {
  LISTA: (filtros: CuentasCorrientesQuery) => ['cuentas-corrientes', 'lista', filtros] as const,
}

/**
 * GET /cuentas-corrientes. El `signal` viene de React Query: cuando cambian
 * los filtros, el request anterior se aborta y no puede pisar al nuevo.
 */
export async function listarCuentasCorrientes(
  filtros: CuentasCorrientesQuery,
  signal?: AbortSignal
): Promise<CuentasCorrientesResponse> {
  const { data } = await httpClient.get<CuentasCorrientesResponse>('/cuentas-corrientes', {
    params: {
      FK_proveedor: filtros.FKProveedor,
      condicion_saldo: filtros.condicionSaldo,
      // El backend lo valida como enum de strings ('true'/'false'), no como booleano.
      estado: filtros.estado === undefined ? undefined : String(filtros.estado),
      page: filtros.page,
      limit: filtros.limit,
    },
    signal,
  })

  return data
}
