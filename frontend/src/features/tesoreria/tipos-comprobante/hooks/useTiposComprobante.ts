import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  TIPOS_COMPROBANTE_QUERY_KEYS,
  crearTipoComprobante,
  darDeBajaTipoComprobante,
  editarTipoComprobante,
  listarTiposComprobante,
  obtenerTipoComprobante,
  reactivarTipoComprobante,
} from '../services/tiposComprobante.service'
import type {
  CrearTipoComprobantePayload,
  EditarTipoComprobantePayload,
  TipoComprobante,
  TipoComprobanteAuditado,
  TipoComprobanteDetalle,
  TiposComprobanteQuery,
} from '../types/tipoComprobante.types'

/**
 * Listado paginado de tipos de comprobante. Cada combinación de filtros es su
 * propia entrada de cache, así que una respuesta vieja nunca puede pisar a la
 * actual.
 *
 * `keepPreviousData` mantiene el paginador en pantalla mientras llega la
 * página siguiente: sin eso, `meta` desaparecería y el pie de la tabla saltaría.
 */
export function useTiposComprobante(filtros: TiposComprobanteQuery) {
  return useQuery<PaginatedResponse<TipoComprobante>, ApiErrorResponse>({
    queryKey: TIPOS_COMPROBANTE_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarTiposComprobante(filtros, signal),
    placeholderData: keepPreviousData,
  })
}

/**
 * Detalle de un tipo de comprobante. Con `id` en `null` (modal cerrado) la
 * query queda deshabilitada y, como el id es parte de la key, tampoco arrastra
 * el detalle del tipo anterior.
 */
export function useTipoComprobanteDetalle(id: number | null) {
  return useQuery<TipoComprobanteDetalle, ApiErrorResponse>({
    queryKey: TIPOS_COMPROBANTE_QUERY_KEYS.DETALLE(id),
    // El `!` es seguro: con `id` en `null` la query no corre (`enabled`).
    queryFn: ({ signal }) => obtenerTipoComprobante(id!, signal),
    enabled: id !== null,
  })
}

/** Las mutaciones invalidan el listado; no muestran toasts — eso lo decide quien las use. */

export function useCrearTipoComprobante() {
  const queryClient = useQueryClient()

  return useMutation<TipoComprobanteAuditado, ApiErrorResponse, CrearTipoComprobantePayload>({
    mutationFn: crearTipoComprobante,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-comprobante', 'lista'] })
    },
  })
}

export function useEditarTipoComprobante() {
  const queryClient = useQueryClient()

  return useMutation<
    TipoComprobanteAuditado,
    ApiErrorResponse,
    { id: number; payload: EditarTipoComprobantePayload }
  >({
    mutationFn: ({ id, payload }) => editarTipoComprobante(id, payload),
    onSuccess: (_data, variables) => {
      // El listado se vuelve a pedir con la página y los filtros que estaban
      // puestos, porque son parte de la query key.
      queryClient.invalidateQueries({ queryKey: ['tipos-comprobante', 'lista'] })
      queryClient.invalidateQueries({
        queryKey: TIPOS_COMPROBANTE_QUERY_KEYS.DETALLE(variables.id),
      })
    },
  })
}

/**
 * Baja y reactivación comparten forma: reciben el id, no llevan body y al
 * terminar invalidan el listado y el detalle de ese tipo de comprobante.
 */

export function useDarDeBajaTipoComprobante() {
  const queryClient = useQueryClient()

  return useMutation<TipoComprobanteAuditado, ApiErrorResponse, number>({
    mutationFn: darDeBajaTipoComprobante,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['tipos-comprobante', 'lista'] })
      queryClient.invalidateQueries({ queryKey: TIPOS_COMPROBANTE_QUERY_KEYS.DETALLE(id) })
    },
  })
}

export function useReactivarTipoComprobante() {
  const queryClient = useQueryClient()

  return useMutation<TipoComprobanteAuditado, ApiErrorResponse, number>({
    mutationFn: reactivarTipoComprobante,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['tipos-comprobante', 'lista'] })
      queryClient.invalidateQueries({ queryKey: TIPOS_COMPROBANTE_QUERY_KEYS.DETALLE(id) })
    },
  })
}
