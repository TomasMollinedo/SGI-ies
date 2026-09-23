import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type {
  CancelarVentaPayload,
  ClienteResumen,
  CrearVentaPayload,
  QueryBuscarClientes,
  QueryVenta,
  VentaDetalle,
  VentaListItem,
} from '../types/venta.types'

export const VENTAS_QUERY_KEYS = {
  RAIZ: ['ventas'] as const,
  LISTA: (filtros: QueryVenta) => ['ventas', 'lista', filtros] as const,
  DETALLE: (id: number | null) => ['ventas', 'detalle', id] as const,
  BUSQUEDA_CLIENTES: (busqueda: string) => ['ventas', 'buscar-clientes', busqueda] as const,
}

/** GET /ventas — listado interno paginado, con filtros combinables. */
export async function listarVentas(
  filtros: QueryVenta,
  signal?: AbortSignal
): Promise<PaginatedResponse<VentaListItem>> {
  const { data } = await httpClient.get<PaginatedResponse<VentaListItem>>('/ventas', {
    params: {
      FK_cliente: filtros.FK_cliente,
      FK_publicacion: filtros.FK_publicacion,
      FK_proyecto: filtros.FK_proyecto,
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

/** GET /ventas/:id — cabecera más el cronograma completo de cuotas. */
export async function obtenerVenta(id: number, signal?: AbortSignal): Promise<VentaDetalle> {
  const { data } = await httpClient.get<VentaDetalle>(`/ventas/${id}`, { signal })
  return data
}

/**
 * POST /ventas — busca o crea al cliente, valida publicación/plan, genera el
 * cronograma y pasa la publicación a "En plan de pago". Todo en una
 * transacción atómica del lado del backend.
 */
export async function crearVenta(payload: CrearVentaPayload): Promise<VentaDetalle> {
  const { data } = await httpClient.post<VentaDetalle>('/ventas', payload)
  return data
}

/** PATCH /ventas/:id/cancelar — exige motivo; la unidad vuelve a Disponible. */
export async function cancelarVenta(
  id: number,
  payload: CancelarVentaPayload
): Promise<VentaDetalle> {
  const { data } = await httpClient.patch<VentaDetalle>(`/ventas/${id}/cancelar`, payload)
  return data
}

/**
 * GET /ventas/buscar-clientes — búsqueda por texto libre (nombre, apellido,
 * DNI/CUIL o email), paginada. Alimenta el `ClienteCombobox` del alta de
 * venta; a diferencia de `buscarCliente`, puede devolver más de un cliente.
 */
export async function buscarClientes(
  query: QueryBuscarClientes,
  signal?: AbortSignal
): Promise<PaginatedResponse<ClienteResumen>> {
  const { data } = await httpClient.get<PaginatedResponse<ClienteResumen>>(
    '/ventas/buscar-clientes',
    {
      params: { busqueda: query.busqueda, page: query.page, limit: query.limit },
      signal,
    }
  )

  return data
}
