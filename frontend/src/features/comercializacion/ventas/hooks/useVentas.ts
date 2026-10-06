import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  VENTAS_QUERY_KEYS,
  buscarClientes,
  cancelarVenta,
  crearVenta,
  listarVentas,
  obtenerVenta,
} from '../services/ventas.service'
import type {
  CancelarVentaPayload,
  ClienteResumen,
  CrearVentaPayload,
  QueryVenta,
  VentaDetalle,
  VentaListItem,
} from '../types/venta.types'

/** Mínimo de caracteres para disparar la búsqueda, igual al `minChars` por defecto de `Combobox`. */
const MIN_CARACTERES_BUSQUEDA_CLIENTE = 2
const LIMITE_BUSQUEDA_CLIENTES = 10

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

/**
 * Búsqueda server-side de clientes por nombre/apellido/DNI/email, para el
 * `ClienteCombobox` del alta de venta. Query (no mutation) porque acá sí se
 * dispara al tipear, con el debounce del propio `Combobox`. Deshabilitada
 * por debajo del mínimo de caracteres para no pegarle al backend con cada
 * tecla ni con una búsqueda vacía al montar.
 */
export function useBuscarClientes(busqueda: string) {
  const terminoLimpio = busqueda.trim()

  return useQuery<PaginatedResponse<ClienteResumen>, ApiErrorResponse>({
    queryKey: VENTAS_QUERY_KEYS.BUSQUEDA_CLIENTES(terminoLimpio),
    queryFn: ({ signal }) =>
      buscarClientes({ busqueda: terminoLimpio, limit: LIMITE_BUSQUEDA_CLIENTES }, signal),
    enabled: terminoLimpio.length >= MIN_CARACTERES_BUSQUEDA_CLIENTE,
    placeholderData: keepPreviousData,
  })
}
