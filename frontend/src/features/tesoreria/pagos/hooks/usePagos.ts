import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import {
  PAGOS_QUERY_KEYS,
  anularPago,
  crearPago,
  listarComprobantesImputables,
  listarPagos,
  obtenerPago,
} from '../services/pagos.service'
import type {
  AnularPagoPayload,
  ComprobantesImputablesResponse,
  CrearPagoPayload,
  PagoDetalle,
  PagosListResponse,
  PagosQuery,
} from '../types/pago.types'

/**
 * Listado paginado de pagos. Cada combinación de filtros es su propia entrada
 * de cache, así que una respuesta vieja nunca puede pisar a la actual.
 *
 * `keepPreviousData` mantiene el paginador (y el resumen del período) en
 * pantalla mientras llega la página siguiente: sin eso, `meta` desaparecería y
 * el pie de la tabla saltaría.
 */
export function usePagos(filtros: PagosQuery) {
  return useQuery<PagosListResponse, ApiErrorResponse>({
    queryKey: PAGOS_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarPagos(filtros, signal),
    placeholderData: keepPreviousData,
  })
}

/**
 * Comprobantes imputables del proveedor elegido, para el detalle del
 * formulario de emisión. Con `FK_proveedor` en `null` (todavía no se eligió
 * proveedor) la query queda deshabilitada.
 */
export function useComprobantesImputables(FK_proveedor: number | null) {
  return useQuery<ComprobantesImputablesResponse, ApiErrorResponse>({
    queryKey: PAGOS_QUERY_KEYS.COMPROBANTES_IMPUTABLES(FK_proveedor ?? 0),
    // El `!` es seguro: con `FK_proveedor` en `null` la query no corre (`enabled`).
    queryFn: ({ signal }) => listarComprobantesImputables(FK_proveedor!, signal),
    enabled: FK_proveedor !== null,
  })
}

/**
 * Detalle de un pago. Con `id` en `null` (modal cerrado) la query queda
 * deshabilitada y, como el id es parte de la key, tampoco arrastra el detalle
 * del pago anterior.
 */
export function usePagoDetalle(id: number | null) {
  return useQuery<PagoDetalle, ApiErrorResponse>({
    queryKey: PAGOS_QUERY_KEYS.DETALLE(id),
    // El `!` es seguro: con `id` en `null` la query no corre (`enabled`).
    queryFn: ({ signal }) => obtenerPago(id!, signal),
    enabled: id !== null,
  })
}

/** Alta (confirmación) de un pago. No muestra toast — eso lo decide quien la use. */
export function useCrearPago() {
  const queryClient = useQueryClient()

  return useMutation<PagoDetalle, ApiErrorResponse, CrearPagoPayload>({
    mutationFn: crearPago,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagos', 'lista'] })
    },
  })
}

/** Anulación de un pago CONFIRMADA. Restituye el saldo pendiente de cada comprobante imputado. */
export function useAnularPago() {
  const queryClient = useQueryClient()

  return useMutation<PagoDetalle, ApiErrorResponse, { id: number; payload: AnularPagoPayload }>({
    mutationFn: ({ id, payload }) => anularPago(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pagos', 'lista'] })
      queryClient.invalidateQueries({ queryKey: PAGOS_QUERY_KEYS.DETALLE(variables.id) })
    },
  })
}
