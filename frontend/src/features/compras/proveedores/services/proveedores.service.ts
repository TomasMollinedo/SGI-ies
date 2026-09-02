import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type { CondicionIva, Proveedor, ProveedoresQuery } from '../types/proveedor.types'

export const PROVEEDORES_QUERY_KEYS = {
  LISTA: (filtros: ProveedoresQuery) => ['proveedores', 'lista', filtros] as const,
  CONDICIONES_IVA: ['proveedores', 'condiciones-iva'] as const,
}

/**
 * GET /proveedores. El `signal` viene de React Query: cuando cambian los
 * filtros, el request anterior se aborta y no puede pisar al nuevo.
 */
export async function listarProveedores(
  filtros: ProveedoresQuery,
  signal?: AbortSignal
): Promise<PaginatedResponse<Proveedor>> {
  const { data } = await httpClient.get<PaginatedResponse<Proveedor>>('/proveedores', {
    params: {
      busqueda: filtros.busqueda,
      condicion_iva: filtros.condicionIva,
      estado: filtros.estado,
      page: filtros.page,
      limit: filtros.limit,
    },
    signal,
  })

  return data
}

/** GET /proveedores/condiciones-iva — catálogo para el filtro de condición frente al IVA. */
export async function listarCondicionesIva(signal?: AbortSignal): Promise<CondicionIva[]> {
  const { data } = await httpClient.get<CondicionIva[]>('/proveedores/condiciones-iva', { signal })
  return data
}
