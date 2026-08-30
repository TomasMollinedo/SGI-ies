import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  MOVIMIENTOS_QUERY_KEYS,
  crearMovimiento,
  listarMovimientos,
  obtenerMovimiento,
} from '../services/movimientos.service'
import type {
  CrearMovimientoPayload,
  Movimiento,
  MovimientoCreado,
  MovimientoDetalle,
  MovimientosQuery,
} from '../types/movimiento.types'

/** Al crear un movimiento cambia tanto el listado de movimientos como la cantidad de las fichas de stock afectadas. */
export function useCrearMovimiento() {
  const queryClient = useQueryClient()

  return useMutation<MovimientoCreado, ApiErrorResponse, CrearMovimientoPayload>({
    mutationFn: crearMovimiento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos', 'lista'] })
      queryClient.invalidateQueries({ queryKey: ['stock', 'lista'] })
    },
  })
}

/**
 * Listado paginado de movimientos. Cada combinación de filtros es su propia
 * entrada de cache, así que una respuesta vieja nunca puede pisar a la actual.
 *
 * `keepPreviousData` mantiene el paginador en pantalla mientras llega la página
 * siguiente: sin eso, `meta` desaparecería y el pie de la tabla saltaría.
 */
export function useMovimientos(filtros: MovimientosQuery) {
  return useQuery<PaginatedResponse<Movimiento>, ApiErrorResponse>({
    queryKey: MOVIMIENTOS_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarMovimientos(filtros, signal),
    placeholderData: keepPreviousData,
  })
}

/**
 * Detalle de un movimiento. Con `id` en `null` (modal cerrado) la query queda
 * deshabilitada y, como el id es parte de la key, tampoco arrastra el detalle
 * del movimiento anterior.
 */
export function useMovimientoDetalle(id: number | null) {
  return useQuery<MovimientoDetalle, ApiErrorResponse>({
    queryKey: MOVIMIENTOS_QUERY_KEYS.DETALLE(id),
    // El `!` es seguro: con `id` en `null` la query no corre (`enabled`).
    queryFn: ({ signal }) => obtenerMovimiento(id!, signal),
    enabled: id !== null,
  })
}
