import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  TIPOS_MOVIMIENTO_QUERY_KEYS,
  listarTiposMovimiento,
  obtenerTipoMovimiento,
} from '../services/tiposMovimiento.service'
import type {
  TipoMovimiento,
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
