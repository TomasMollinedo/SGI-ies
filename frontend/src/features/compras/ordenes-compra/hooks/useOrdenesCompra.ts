import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  ORDENES_COMPRA_QUERY_KEYS,
  cambiarEstadoOrdenCompra,
  crearOrdenCompra,
  listarOrdenesCompra,
  obtenerOrdenCompra,
} from '../services/ordenesCompra.service'
import type {
  CambiarEstadoOrdenCompraPayload,
  CrearOrdenCompraPayload,
  OrdenCompra,
  OrdenCompraListItem,
  OrdenesCompraQuery,
} from '../types/ordenCompra.types'

/**
 * Listado paginado de órdenes de compra. Cada combinación de filtros es su
 * propia entrada de cache, así que una respuesta vieja nunca puede pisar a la
 * actual. `keepPreviousData` mantiene el paginador en pantalla mientras llega
 * la página siguiente.
 */
export function useOrdenesCompra(filtros: OrdenesCompraQuery) {
  return useQuery<PaginatedResponse<OrdenCompraListItem>, ApiErrorResponse>({
    queryKey: ORDENES_COMPRA_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarOrdenesCompra(filtros, signal),
    placeholderData: keepPreviousData,
  })
}

/**
 * Detalle de una orden de compra. Con `id` en `null` (modal cerrado) la query
 * queda deshabilitada y, como el id es parte de la key, tampoco arrastra el
 * estado de la orden anterior.
 */
export function useOrdenCompraDetalle(id: number | null) {
  return useQuery<OrdenCompra, ApiErrorResponse>({
    queryKey: ORDENES_COMPRA_QUERY_KEYS.DETALLE(id),
    // El `!` es seguro: con `id` en `null` la query no corre (`enabled`).
    queryFn: ({ signal }) => obtenerOrdenCompra(id!, signal),
    enabled: id !== null,
  })
}

/** No muestra toast — eso lo decide quien la use. */
export function useCrearOrdenCompra() {
  const queryClient = useQueryClient()

  return useMutation<OrdenCompra, ApiErrorResponse, CrearOrdenCompraPayload>({
    mutationFn: crearOrdenCompra,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] })
    },
  })
}

export function useCambiarEstadoOrdenCompra() {
  const queryClient = useQueryClient()

  return useMutation<
    OrdenCompra,
    ApiErrorResponse,
    { id: number; payload: CambiarEstadoOrdenCompraPayload }
  >({
    mutationFn: ({ id, payload }) => cambiarEstadoOrdenCompra(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] })
    },
  })
}
