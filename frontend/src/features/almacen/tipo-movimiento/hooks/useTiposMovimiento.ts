import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  TIPOS_MOVIMIENTO_QUERY_KEYS,
  crearTipoMovimiento,
  editarTipoMovimiento,
  listarTiposMovimiento,
  obtenerTipoMovimiento,
} from '../services/tiposMovimiento.service'
import type {
  CrearTipoMovimientoPayload,
  EditarTipoMovimientoPayload,
  TipoMovimiento,
  TipoMovimientoAuditado,
  TipoMovimientoDetalle,
  TiposMovimientoQuery,
} from '../types/tipoMovimiento.types'

/**
 * Listado paginado de tipos de movimiento. Cada combinación de filtros es su
 * propia entrada de cache, así que una respuesta vieja nunca puede pisar a la
 * actual.
 *
 * `keepPreviousData` mantiene el paginador en pantalla mientras llega la página
 * siguiente: sin eso, `meta` desaparecería y el pie de la tabla saltaría.
 */
export function useTiposMovimiento(filtros: TiposMovimientoQuery) {
  return useQuery<PaginatedResponse<TipoMovimiento>, ApiErrorResponse>({
    queryKey: TIPOS_MOVIMIENTO_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarTiposMovimiento(filtros, signal),
    placeholderData: keepPreviousData,
  })
}

/**
 * Detalle de un tipo de movimiento. Con `id` en `null` (modal cerrado) la query
 * queda deshabilitada y, como el id es parte de la key, tampoco arrastra el
 * detalle del tipo anterior.
 */
export function useTipoMovimientoDetalle(id: number | null) {
  return useQuery<TipoMovimientoDetalle, ApiErrorResponse>({
    queryKey: TIPOS_MOVIMIENTO_QUERY_KEYS.DETALLE(id),
    // El `!` es seguro: con `id` en `null` la query no corre (`enabled`).
    queryFn: ({ signal }) => obtenerTipoMovimiento(id!, signal),
    enabled: id !== null,
  })
}

/** Las mutaciones invalidan el listado; no muestran toasts — eso lo decide quien las use. */

export function useCrearTipoMovimiento() {
  const queryClient = useQueryClient()

  return useMutation<TipoMovimientoAuditado, ApiErrorResponse, CrearTipoMovimientoPayload>({
    mutationFn: crearTipoMovimiento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-movimiento', 'lista'] })
    },
  })
}

export function useEditarTipoMovimiento() {
  const queryClient = useQueryClient()

  return useMutation<
    TipoMovimientoAuditado,
    ApiErrorResponse,
    { id: number; payload: EditarTipoMovimientoPayload }
  >({
    mutationFn: ({ id, payload }) => editarTipoMovimiento(id, payload),
    onSuccess: (_data, variables) => {
      // El listado se vuelve a pedir con la página y los filtros que estaban
      // puestos, porque son parte de la query key.
      queryClient.invalidateQueries({ queryKey: ['tipos-movimiento', 'lista'] })
      queryClient.invalidateQueries({ queryKey: TIPOS_MOVIMIENTO_QUERY_KEYS.DETALLE(variables.id) })
    },
  })
}
