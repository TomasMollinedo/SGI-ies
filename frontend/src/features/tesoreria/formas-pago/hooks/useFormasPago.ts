import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  FORMAS_PAGO_QUERY_KEYS,
  crearFormaPago,
  darDeBajaFormaPago,
  editarFormaPago,
  listarFormasPago,
  obtenerFormaPago,
  reactivarFormaPago,
} from '../services/formasPago.service'
import type {
  CrearFormaPagoPayload,
  EditarFormaPagoPayload,
  FormaPago,
  FormaPagoAuditada,
  FormaPagoDetalle,
  FormasPagoQuery,
} from '../types/formaPago.types'

/**
 * Listado paginado de formas de pago. Cada combinación de filtros es su propia
 * entrada de cache, así que una respuesta vieja nunca puede pisar a la actual.
 *
 * `keepPreviousData` mantiene el paginador en pantalla mientras llega la página
 * siguiente: sin eso, `meta` desaparecería y el pie de la tabla saltaría.
 */
export function useFormasPago(filtros: FormasPagoQuery) {
  return useQuery<PaginatedResponse<FormaPago>, ApiErrorResponse>({
    queryKey: FORMAS_PAGO_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarFormasPago(filtros, signal),
    placeholderData: keepPreviousData,
  })
}

/**
 * Detalle de una forma de pago. Con `id` en `null` (modal cerrado) la query
 * queda deshabilitada y, como el id es parte de la key, tampoco arrastra el
 * detalle de la forma anterior.
 */
export function useFormaPagoDetalle(id: number | null) {
  return useQuery<FormaPagoDetalle, ApiErrorResponse>({
    queryKey: FORMAS_PAGO_QUERY_KEYS.DETALLE(id),
    // El `!` es seguro: con `id` en `null` la query no corre (`enabled`).
    queryFn: ({ signal }) => obtenerFormaPago(id!, signal),
    enabled: id !== null,
  })
}

/** Las mutaciones invalidan el listado; no muestran toasts — eso lo decide quien las use. */

export function useCrearFormaPago() {
  const queryClient = useQueryClient()

  return useMutation<FormaPagoAuditada, ApiErrorResponse, CrearFormaPagoPayload>({
    mutationFn: crearFormaPago,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formas-pago', 'lista'] })
    },
  })
}

export function useEditarFormaPago() {
  const queryClient = useQueryClient()

  return useMutation<
    FormaPagoAuditada,
    ApiErrorResponse,
    { id: number; payload: EditarFormaPagoPayload }
  >({
    mutationFn: ({ id, payload }) => editarFormaPago(id, payload),
    onSuccess: (_data, variables) => {
      // El listado se vuelve a pedir con la página y los filtros que estaban
      // puestos, porque son parte de la query key.
      queryClient.invalidateQueries({ queryKey: ['formas-pago', 'lista'] })
      queryClient.invalidateQueries({ queryKey: FORMAS_PAGO_QUERY_KEYS.DETALLE(variables.id) })
    },
  })
}

/**
 * Baja y reactivación comparten forma: reciben el id, no llevan body y al
 * terminar invalidan el listado y el detalle de esa forma de pago.
 */

export function useDarDeBajaFormaPago() {
  const queryClient = useQueryClient()

  return useMutation<FormaPagoAuditada, ApiErrorResponse, number>({
    mutationFn: darDeBajaFormaPago,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['formas-pago', 'lista'] })
      queryClient.invalidateQueries({ queryKey: FORMAS_PAGO_QUERY_KEYS.DETALLE(id) })
    },
  })
}

export function useReactivarFormaPago() {
  const queryClient = useQueryClient()

  return useMutation<FormaPagoAuditada, ApiErrorResponse, number>({
    mutationFn: reactivarFormaPago,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['formas-pago', 'lista'] })
      queryClient.invalidateQueries({ queryKey: FORMAS_PAGO_QUERY_KEYS.DETALLE(id) })
    },
  })
}
