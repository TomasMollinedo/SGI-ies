import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type {
  CancelarVentaPayload,
  ClienteResumen,
  CrearVentaPayload,
  PlanEjemploResumen,
  QueryBuscarClientes,
  QueryVenta,
  SimularVentaPayload,
  SimulacionVenta,
  VentaDetalle,
  VentaListItem,
} from '../types/venta.types'

export const VENTAS_QUERY_KEYS = {
  RAIZ: ['ventas'] as const,
  LISTA: (filtros: QueryVenta) => ['ventas', 'lista', filtros] as const,
  DETALLE: (id: number | null) => ['ventas', 'detalle', id] as const,
  BUSQUEDA_CLIENTES: (busqueda: string) => ['ventas', 'buscar-clientes', busqueda] as const,
  PLANES_EJEMPLO: (FK_publicacion: number) => ['ventas', 'planes-ejemplo', FK_publicacion] as const,
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
      modalidad: filtros.modalidad,
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
 * POST /ventas/simular — calcula el plan de pago que se está acordando, sin
 * guardar nada. El precio de lista y la TNA del plazo son los vigentes al
 * simular, nunca los manda el frontend.
 */
export async function simularVenta(payload: SimularVentaPayload): Promise<SimulacionVenta> {
  const { data } = await httpClient.post<SimulacionVenta>('/ventas/simular', payload)
  return data
}

/**
 * POST /ventas — busca o crea al cliente, valida publicación/plazo, genera el
 * cronograma y pasa la publicación a "En plan de pago". Todo en una
 * transacción atómica del lado del backend.
 */
export async function crearVenta(payload: CrearVentaPayload): Promise<VentaDetalle> {
  const { data } = await httpClient.post<VentaDetalle>('/ventas', payload)
  return data
}

/**
 * GET /planes-ejemplo?FK_publicacion — los planes de ejemplo activos de la
 * publicación (HU-22), solo para precargar el simulador de la venta. Sin
 * paginación: son pocos por diseño.
 */
export async function listarPlanesEjemploPublicacion(
  FK_publicacion: number,
  signal?: AbortSignal
): Promise<PlanEjemploResumen[]> {
  const { data } = await httpClient.get<PlanEjemploResumen[]>('/planes-ejemplo', {
    params: { FK_publicacion },
    signal,
  })
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
