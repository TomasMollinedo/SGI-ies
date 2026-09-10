import { httpClient } from '@/shared/api/httpClient'
import type {
  CambiarEstadoOrdenCompraPayload,
  CrearOrdenCompraPayload,
  OrdenCompra,
} from '../types/ordenCompra.types'

export const ORDENES_COMPRA_QUERY_KEYS = {
  DETALLE: (id: number | null) => ['ordenes-compra', 'detalle', id] as const,
}

/** POST /ordenes-compra — crea la orden en estado BORRADOR. */
export async function crearOrdenCompra(payload: CrearOrdenCompraPayload): Promise<OrdenCompra> {
  const { data } = await httpClient.post<OrdenCompra>('/ordenes-compra', payload)
  return data
}

/** PATCH /ordenes-compra/:id/estado — avanza el estado (ej. BORRADOR → EMITIDA al confirmar). */
export async function cambiarEstadoOrdenCompra(
  id: number,
  payload: CambiarEstadoOrdenCompraPayload
): Promise<OrdenCompra> {
  const { data } = await httpClient.patch<OrdenCompra>(`/ordenes-compra/${id}/estado`, payload)
  return data
}
