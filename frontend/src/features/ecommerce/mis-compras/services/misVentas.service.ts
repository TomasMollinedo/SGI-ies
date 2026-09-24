import { httpClientCliente } from '@/shared/api/httpClientCliente'
import type { MiVentaDetalle, MisVentasResponse } from '../types/miVenta.types'

export const MIS_VENTAS_QUERY_KEYS = {
  LISTA: ['mis-ventas', 'lista'] as const,
  DETALLE: (idVenta: number) => ['mis-ventas', 'detalle', idVenta] as const,
}

/** GET /cliente/ventas (T112, HU-28): las unidades del cliente autenticado, sin paginar. */
export async function listarMisVentas(signal?: AbortSignal): Promise<MisVentasResponse> {
  const { data } = await httpClientCliente.get<MisVentasResponse>('/cliente/ventas', { signal })
  return data
}

/**
 * GET /cliente/ventas/:id (T112, HU-28): plan de pago y cronograma completo
 * de cuotas de una unidad propia. 404 si la venta no existe, no es de este
 * cliente, o no está vigente — el backend no distingue el motivo a propósito.
 */
export async function obtenerDetalleMiVenta(
  idVenta: number,
  signal?: AbortSignal
): Promise<MiVentaDetalle> {
  const { data } = await httpClientCliente.get<MiVentaDetalle>(`/cliente/ventas/${idVenta}`, {
    signal,
  })
  return data
}
