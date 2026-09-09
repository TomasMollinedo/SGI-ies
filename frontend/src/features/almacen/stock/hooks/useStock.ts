import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  STOCK_QUERY_KEYS,
  crearStock,
  darDeBajaStock,
  editarStock,
  listarStock,
  obtenerCardex,
  obtenerStock,
  reactivarStock,
} from '../services/stock.service'
import type { CardexResponse, FiltrosCardex } from '../types/cardex.types'
import type {
  CrearStockPayload,
  EditarStockPayload,
  FiltrosStock,
  Stock,
  StockAuditado,
  StockDetalle,
} from '../types/stock.types'

/** placeholderData: keepPreviousData evita el flash de loading al cambiar de página o filtro. */
export function useStock(filtros: FiltrosStock) {
  return useQuery<PaginatedResponse<Stock>, ApiErrorResponse>({
    queryKey: STOCK_QUERY_KEYS.LISTA(filtros),
    queryFn: () => listarStock(filtros),
    placeholderData: keepPreviousData,
  })
}

export function useStockDetalle(id: number | null) {
  return useQuery<StockDetalle, ApiErrorResponse>({
    queryKey: STOCK_QUERY_KEYS.DETALLE(id ?? -1),
    queryFn: () => obtenerStock(id as number),
    enabled: id !== null,
  })
}

/**
 * Cardex de una ficha. `enabled` en null porque la página lo pide con el id que
 * viene de la URL, que puede no ser un número válido.
 *
 * Mismo `keepPreviousData` que el listado: al cambiar de página o de período,
 * la tabla anterior queda en pantalla en vez de parpadear.
 */
export function useCardex(id: number | null, filtros: FiltrosCardex) {
  return useQuery<CardexResponse, ApiErrorResponse>({
    queryKey: STOCK_QUERY_KEYS.CARDEX(id ?? -1, filtros),
    queryFn: () => obtenerCardex(id as number, filtros),
    enabled: id !== null,
    placeholderData: keepPreviousData,
  })
}

/** Las 4 mutaciones invalidan el listado; no muestran toasts — eso lo decide quien las use. */

export function useCrearStock() {
  const queryClient = useQueryClient()

  return useMutation<StockAuditado, ApiErrorResponse, CrearStockPayload>({
    mutationFn: crearStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock', 'lista'] })
    },
  })
}

export function useEditarStock() {
  const queryClient = useQueryClient()

  return useMutation<StockAuditado, ApiErrorResponse, { id: number; payload: EditarStockPayload }>({
    mutationFn: ({ id, payload }) => editarStock(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock', 'lista'] })
      queryClient.invalidateQueries({ queryKey: STOCK_QUERY_KEYS.DETALLE(variables.id) })
    },
  })
}

export function useDarDeBajaStock() {
  const queryClient = useQueryClient()

  return useMutation<StockAuditado, ApiErrorResponse, number>({
    mutationFn: darDeBajaStock,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['stock', 'lista'] })
      queryClient.invalidateQueries({ queryKey: STOCK_QUERY_KEYS.DETALLE(id) })
    },
  })
}

export function useReactivarStock() {
  const queryClient = useQueryClient()

  return useMutation<StockAuditado, ApiErrorResponse, number>({
    mutationFn: reactivarStock,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['stock', 'lista'] })
      queryClient.invalidateQueries({ queryKey: STOCK_QUERY_KEYS.DETALLE(id) })
    },
  })
}
