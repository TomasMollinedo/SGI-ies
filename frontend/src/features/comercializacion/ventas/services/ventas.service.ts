import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type {
  BuscarClienteQuery,
  CancelarVentaPayload,
  ClienteBuscado,
  CrearVentaPayload,
  QueryVenta,
  VentaDetalle,
  VentaListItem,
} from '../types/venta.types'

export const VENTAS_QUERY_KEYS = {
  RAIZ: ['ventas'] as const,
  LISTA: (filtros: QueryVenta) => ['ventas', 'lista', filtros] as const,
  DETALLE: (id: number | null) => ['ventas', 'detalle', id] as const,
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
      estado: filtros.estado,
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
 * GET /ventas/buscar-cliente — para el buscador del formulario: si el cliente
 * ya existe, no se le vuelve a pedir nombre/teléfono. `encontrado: false` no
 * es un error, es el estado esperado la primera vez que compra.
 */
export async function buscarCliente(query: BuscarClienteQuery): Promise<ClienteBuscado> {
  const { data } = await httpClient.get<ClienteBuscado>('/ventas/buscar-cliente', {
    params: { dni_cuil: query.dni_cuil, email: query.email },
  })

  return data
}
