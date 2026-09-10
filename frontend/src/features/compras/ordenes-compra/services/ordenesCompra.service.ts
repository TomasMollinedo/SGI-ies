import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type {
  CambiarEstadoOrdenCompraPayload,
  CrearOrdenCompraPayload,
  OrdenCompra,
  OrdenCompraListItem,
  OrdenesCompraQuery,
} from '../types/ordenCompra.types'

export const ORDENES_COMPRA_QUERY_KEYS = {
  LISTA: (filtros: OrdenesCompraQuery) => ['ordenes-compra', 'lista', filtros] as const,
  DETALLE: (id: number | null) => ['ordenes-compra', 'detalle', id] as const,
}

/** POST /ordenes-compra — crea la orden en estado BORRADOR. */
export async function crearOrdenCompra(payload: CrearOrdenCompraPayload): Promise<OrdenCompra> {
  const { data } = await httpClient.post<OrdenCompra>('/ordenes-compra', payload)
  return data
}

/**
 * GET /ordenes-compra. El `signal` viene de React Query: cuando cambian los
 * filtros, el request anterior se aborta y no puede pisar al nuevo.
 *
 * Los filtros en `undefined` axios no los manda, y sin ellos el backend no
 * filtra. El orden lo define el backend (más reciente primero) y acá no se toca.
 */
export async function listarOrdenesCompra(
  filtros: OrdenesCompraQuery,
  signal?: AbortSignal
): Promise<PaginatedResponse<OrdenCompraListItem>> {
  const { data } = await httpClient.get<PaginatedResponse<OrdenCompraListItem>>('/ordenes-compra', {
    params: {
      FK_proveedor: filtros.FK_proveedor,
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

/** GET /ordenes-compra/:id — la cabecera completa con todas sus líneas, para el modal de detalle. */
export async function obtenerOrdenCompra(id: number, signal?: AbortSignal): Promise<OrdenCompra> {
  const { data } = await httpClient.get<OrdenCompra>(`/ordenes-compra/${id}`, { signal })
  return data
}

/** PATCH /ordenes-compra/:id — edita cabecera y/o detalle. Solo funciona si la orden está en BORRADOR. */
export async function editarOrdenCompra(
  id: number,
  payload: CrearOrdenCompraPayload
): Promise<OrdenCompra> {
  const { data } = await httpClient.patch<OrdenCompra>(`/ordenes-compra/${id}`, payload)
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
