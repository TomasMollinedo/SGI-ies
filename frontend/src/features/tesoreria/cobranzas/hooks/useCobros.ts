import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import {
  VENTAS_QUERY_KEYS,
  buscarClientes,
} from '@/features/comercializacion/ventas/services/ventas.service'
import type { ClienteResumen } from '@/features/comercializacion/ventas/types/venta.types'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  COBROS_QUERY_KEYS,
  anularCobro,
  crearCobro,
  listarCuotasImputables,
  obtenerCobro,
} from '../services/cobros.service'
import type {
  AnularCobroPayload,
  CobroDetalle,
  CrearCobroPayload,
  CuotasImputablesResponse,
} from '../types/cobro.types'

const LIMITE_BUSQUEDA_CLIENTES = 8

/**
 * Cuotas imputables del cliente elegido, para el detalle del formulario de
 * cobro. Con `idCliente` en `null` (todavía no se eligió cliente) la query
 * queda deshabilitada.
 */
export function useCuotasImputables(idCliente: number | null) {
  return useQuery<CuotasImputablesResponse, ApiErrorResponse>({
    queryKey: COBROS_QUERY_KEYS.CUOTAS_IMPUTABLES(idCliente ?? 0),
    // El `!` es seguro: con `idCliente` en `null` la query no corre (`enabled`).
    queryFn: ({ signal }) => listarCuotasImputables(idCliente!, signal),
    enabled: idCliente !== null,
  })
}

/**
 * Búsqueda paginada de clientes para el `SelectorClienteModal`. Reusa la
 * función del servicio de Ventas (el endpoint es de ese módulo), pero no su
 * hook: `useBuscarClientes` trae solo la primera página para un combobox, y
 * acá hace falta paginar. El backend exige `busqueda`, así que sin texto (o
 * con el modal cerrado) la query queda deshabilitada.
 */
export function useBuscarClientesCobro(busqueda: string, page: number, habilitado: boolean) {
  const terminoLimpio = busqueda.trim()

  return useQuery<PaginatedResponse<ClienteResumen>, ApiErrorResponse>({
    queryKey: COBROS_QUERY_KEYS.BUSQUEDA_CLIENTES(terminoLimpio, page),
    queryFn: ({ signal }) =>
      buscarClientes({ busqueda: terminoLimpio, page, limit: LIMITE_BUSQUEDA_CLIENTES }, signal),
    enabled: habilitado && terminoLimpio.length > 0,
    placeholderData: keepPreviousData,
  })
}

/** Detalle de un cobro. Con `id` en `null` la query queda deshabilitada. */
export function useCobroDetalle(id: number | null) {
  return useQuery<CobroDetalle, ApiErrorResponse>({
    queryKey: COBROS_QUERY_KEYS.DETALLE(id),
    // El `!` es seguro: con `id` en `null` la query no corre (`enabled`).
    queryFn: ({ signal }) => obtenerCobro(id!, signal),
    enabled: id !== null,
  })
}

/**
 * Lo que cambia fuera de Cobros al confirmar o anular uno: el saldo de las
 * cuotas del cliente, el cronograma de sus ventas, y el estado comercial de
 * la unidad (saldar la última cuota la pasa a Vendida; anular la puede
 * devolver a En Plan de Pago).
 */
function invalidarAfectadosPorCobro(queryClient: QueryClient, idCliente: number) {
  queryClient.invalidateQueries({ queryKey: COBROS_QUERY_KEYS.LISTAS })
  queryClient.invalidateQueries({ queryKey: COBROS_QUERY_KEYS.CUOTAS_IMPUTABLES(idCliente) })
  queryClient.invalidateQueries({ queryKey: VENTAS_QUERY_KEYS.RAIZ })
  queryClient.invalidateQueries({ queryKey: ['publicaciones'] })
}

/** Alta (confirmación) de un cobro. No muestra toast — eso lo decide quien la use. */
export function useCrearCobro() {
  const queryClient = useQueryClient()

  return useMutation<CobroDetalle, ApiErrorResponse, CrearCobroPayload>({
    mutationFn: crearCobro,
    onSuccess: (cobro, payload) => {
      invalidarAfectadosPorCobro(queryClient, payload.FK_cliente)
      // La respuesta ya es el detalle completo: se siembra en la cache para
      // que la pantalla de detalle (a la que se navega al confirmar) lo
      // muestre al toque, sin un segundo request.
      queryClient.setQueryData(COBROS_QUERY_KEYS.DETALLE(cobro.id_cobro), cobro)
    },
  })
}

/** Anulación de un cobro CONFIRMADO. Restituye el saldo de cada cuota imputada. */
export function useAnularCobro() {
  const queryClient = useQueryClient()

  return useMutation<CobroDetalle, ApiErrorResponse, { id: number; payload: AnularCobroPayload }>({
    mutationFn: ({ id, payload }) => anularCobro(id, payload),
    onSuccess: (cobro, variables) => {
      invalidarAfectadosPorCobro(queryClient, cobro.FK_cliente)
      queryClient.invalidateQueries({ queryKey: COBROS_QUERY_KEYS.DETALLE(variables.id) })
    },
  })
}
