import { httpClientCliente } from '@/shared/api/httpClientCliente'
import type {
  HistorialPagosResponse,
  MiVentaDetalle,
  MisVentasResponse,
} from '../types/miVenta.types'

export const MIS_VENTAS_QUERY_KEYS = {
  LISTA: ['mis-ventas', 'lista'] as const,
  DETALLE: (idVenta: number) => ['mis-ventas', 'detalle', idVenta] as const,
  HISTORIAL_PAGOS: (idVenta: number, page: number) =>
    ['mis-ventas', 'historial-pagos', idVenta, page] as const,
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

/**
 * GET /cliente/ventas/:id/historial-pagos (T112, HU-28): pagos de esta unidad,
 * del más reciente al más antiguo. Un cobro que imputó a cuotas de otra
 * unidad del mismo cliente aparece acá partido, solo con el subtotal de esta
 * venta.
 */
export async function obtenerHistorialPagos(
  idVenta: number,
  page: number,
  limit: number,
  signal?: AbortSignal
): Promise<HistorialPagosResponse> {
  const { data } = await httpClientCliente.get<HistorialPagosResponse>(
    `/cliente/ventas/${idVenta}/historial-pagos`,
    { params: { page, limit }, signal }
  )
  return data
}
