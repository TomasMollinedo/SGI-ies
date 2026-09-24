import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { VENTAS_QUERY_KEYS } from '@/features/comercializacion/ventas/services/ventas.service'
import { COBROS_QUERY_KEYS } from '@/features/tesoreria/cobranzas/services/cobros.service'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import {
  DECLARACIONES_PAGO_QUERY_KEYS,
  listarDeclaracionesPago,
  rechazarDeclaracionPago,
  validarDeclaracionPago,
} from '../services/declaracionesPago.service'
import type {
  DeclaracionPagoBase,
  DeclaracionesPagoListResponse,
  DeclaracionesPagoQuery,
  RechazarDeclaracionPayload,
} from '../types/declaracionPago.types'

/**
 * Bandeja paginada de declaraciones. Cada combinación de filtros es su propia
 * entrada de cache; `keepPreviousData` mantiene el paginador en pantalla
 * mientras llega la página siguiente (mismo criterio que `usePagos`).
 */
export function useDeclaracionesPago(filtros: DeclaracionesPagoQuery) {
  return useQuery<DeclaracionesPagoListResponse, ApiErrorResponse>({
    queryKey: DECLARACIONES_PAGO_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarDeclaracionesPago(filtros, signal),
    placeholderData: keepPreviousData,
  })
}

/**
 * Validar genera un cobro real: además de la bandeja, cambia lo mismo que
 * confirmar un cobro desde Cobranzas — el listado de cobros, las cuotas
 * imputables y el saldo de las cuotas del cliente, el cronograma de sus
 * ventas y el estado comercial de la unidad (saldar la última cuota la pasa
 * a Vendida). Mismas keys que invalida `invalidarAfectadosPorCobro`.
 */
function invalidarAfectadosPorValidacion(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: DECLARACIONES_PAGO_QUERY_KEYS.LISTAS })
  queryClient.invalidateQueries({ queryKey: COBROS_QUERY_KEYS.RAIZ })
  queryClient.invalidateQueries({ queryKey: VENTAS_QUERY_KEYS.RAIZ })
  queryClient.invalidateQueries({ queryKey: ['publicaciones'] })
}

/** Valida una declaración PENDIENTE. No muestra toast — eso lo decide quien la use. */
export function useValidarDeclaracionPago() {
  const queryClient = useQueryClient()

  return useMutation<DeclaracionPagoBase, ApiErrorResponse, number>({
    mutationFn: validarDeclaracionPago,
    onSuccess: () => invalidarAfectadosPorValidacion(queryClient),
  })
}

/** Rechaza una declaración PENDIENTE. No toca saldos: solo cambia la bandeja. */
export function useRechazarDeclaracionPago() {
  const queryClient = useQueryClient()

  return useMutation<
    DeclaracionPagoBase,
    ApiErrorResponse,
    { id: number; payload: RechazarDeclaracionPayload }
  >({
    mutationFn: ({ id, payload }) => rechazarDeclaracionPago(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DECLARACIONES_PAGO_QUERY_KEYS.LISTAS })
    },
  })
}
