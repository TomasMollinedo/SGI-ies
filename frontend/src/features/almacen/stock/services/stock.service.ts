import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type { CardexResponse, FiltrosCardex } from '../types/cardex.types'
import type {
  CrearStockPayload,
  EditarStockPayload,
  FiltrosStock,
  Stock,
  StockAuditado,
  StockDetalle,
} from '../types/stock.types'

export const STOCK_QUERY_KEYS = {
  LISTA: (filtros: FiltrosStock) => ['stock', 'lista', filtros] as const,
  DETALLE: (id: number) => ['stock', 'detalle', id] as const,
  CARDEX: (id: number, filtros: FiltrosCardex) => ['stock', 'cardex', id, filtros] as const,
}

export async function crearStock(payload: CrearStockPayload): Promise<StockAuditado> {
  const { data } = await httpClient.post<StockAuditado>('/stock', payload)
  return data
}

export async function listarStock(filtros: FiltrosStock): Promise<PaginatedResponse<Stock>> {
  const { data } = await httpClient.get<PaginatedResponse<Stock>>('/stock', {
    params: {
      FK_deposito: filtros.FK_deposito,
      es_obrador: filtros.esObrador,
      FK_Categoria: filtros.FK_Categoria,
      nombreArticulo: filtros.nombreArticulo || undefined,
      estado: filtros.estado,
      page: filtros.page,
      limit: filtros.limit,
    },
  })
  return data
}

export async function obtenerStock(id: number): Promise<StockDetalle> {
  const { data } = await httpClient.get<StockDetalle>(`/stock/${id}`)
  return data
}

/**
 * Historial de la ficha. Viene ordenado por número de movimiento ascendente
 * (orden de registro), que es el orden en el que los saldos encadenan.
 */
export async function obtenerCardex(id: number, filtros: FiltrosCardex): Promise<CardexResponse> {
  const { data } = await httpClient.get<CardexResponse>(`/stock/${id}/cardex`, {
    params: {
      fechaDesde: filtros.fechaDesde,
      fechaHasta: filtros.fechaHasta,
      page: filtros.page,
      limit: filtros.limit,
    },
  })
  return data
}

export async function editarStock(id: number, payload: EditarStockPayload): Promise<StockAuditado> {
  const { data } = await httpClient.patch<StockAuditado>(`/stock/${id}`, payload)
  return data
}

export async function darDeBajaStock(id: number): Promise<StockAuditado> {
  const { data } = await httpClient.patch<StockAuditado>(`/stock/${id}/baja`)
  return data
}

export async function reactivarStock(id: number): Promise<StockAuditado> {
  const { data } = await httpClient.patch<StockAuditado>(`/stock/${id}/alta`)
  return data
}
