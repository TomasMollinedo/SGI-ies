import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  VENTAS_QUERY_KEYS,
  buscarCliente,
  cancelarVenta,
  crearVenta,
  listarVentas,
  obtenerVenta,
} from '../services/ventas.service'
import type {
  BuscarClienteQuery,
  CancelarVentaPayload,
  ClienteBuscado,
  CrearVentaPayload,
  QueryVenta,
  VentaDetalle,
  VentaListItem,
} from '../types/venta.types'

/** Listado paginado de ventas. Cada combinación de filtros es su propia entrada de cache. */
export function useVentas(filtros: QueryVenta) {
  return useQuery<PaginatedResponse<VentaListItem>, ApiErrorResponse>({
    queryKey: VENTAS_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarVentas(filtros, signal),
    placeholderData: keepPreviousData,
  })
}

/**
 * Detalle de una venta, con el cronograma completo. Con `id` en `null` la
 * query queda deshabilitada. `staleTime: 0` + refetch al montar: el saldo de
 * cada cuota puede cambiar por un cobro registrado en otra pantalla.
 */
export function useVentaDetalle(id: number | null) {
  return useQuery<VentaDetalle, ApiErrorResponse>({
    queryKey: VENTAS_QUERY_KEYS.DETALLE(id),
    // El `!` es seguro: con `id` en `null` la query no corre (`enabled`).
    queryFn: ({ signal }) => obtenerVenta(id!, signal),
    enabled: id !== null,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

/** No muestra toast: eso lo decide quien la use (para distinguir éxito de los 409 accionables). */
export function useCrearVenta() {
  const queryClient = useQueryClient()

  return useMutation<VentaDetalle, ApiErrorResponse, CrearVentaPayload>({
    mutationFn: crearVenta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENTAS_QUERY_KEYS.RAIZ })
      queryClient.invalidateQueries({ queryKey: ['publicaciones'] })
    },
  })
}

/** La unidad vuelve a Disponible: invalida también publicaciones. */
export function useCancelarVenta() {
  const queryClient = useQueryClient()

  return useMutation<VentaDetalle, ApiErrorResponse, { id: number; payload: CancelarVentaPayload }>(
    {
      mutationFn: ({ id, payload }) => cancelarVenta(id, payload),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: VENTAS_QUERY_KEYS.RAIZ })
        queryClient.invalidateQueries({ queryKey: ['publicaciones'] })
      },
    }
  )
}

/** Mutation y no query a propósito: se dispara con el botón "Buscar", no al tipear. */
export function useBuscarCliente() {
  return useMutation<ClienteBuscado, ApiErrorResponse, BuscarClienteQuery>({
    mutationFn: buscarCliente,
  })
}
