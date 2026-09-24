import { httpClientCliente } from '@/shared/api/httpClientCliente'
import type { MisVentasResponse } from '../types/miVenta.types'

export const MIS_VENTAS_QUERY_KEYS = {
  LISTA: ['mis-ventas', 'lista'] as const,
}

/** GET /cliente/ventas (T112, HU-28): las unidades del cliente autenticado, sin paginar. */
export async function listarMisVentas(signal?: AbortSignal): Promise<MisVentasResponse> {
  const { data } = await httpClientCliente.get<MisVentasResponse>('/cliente/ventas', { signal })
  return data
}
