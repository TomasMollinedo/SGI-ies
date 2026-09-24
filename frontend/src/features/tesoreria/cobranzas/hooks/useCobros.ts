import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { VENTAS_QUERY_KEYS } from '@/features/comercializacion/ventas/services/ventas.service'
import type { ApiErrorResponse } from '@/shared/types/api.types'
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
    onSuccess: (_cobro, payload) => {
      invalidarAfectadosPorCobro(queryClient, payload.FK_cliente)
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
