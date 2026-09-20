import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  PUBLICACIONES_QUERY_KEYS,
  crearPublicacion,
  despublicarPublicacion,
  listarPublicaciones,
  listarUnidadesPublicables,
  obtenerPublicacion,
} from '../services/publicaciones.service'
import type {
  CrearPublicacionPayload,
  DespublicarPublicacionPayload,
  PublicacionDetalle,
  PublicacionListItem,
  PublicacionesQuery,
  UnidadPublicable,
  UnidadesPublicablesQuery,
} from '../types/publicacion.types'

/** Listado paginado de publicaciones. Cada combinación de filtros es su propia entrada de cache. */
export function usePublicaciones(filtros: PublicacionesQuery) {
  return useQuery<PaginatedResponse<PublicacionListItem>, ApiErrorResponse>({
    queryKey: PUBLICACIONES_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarPublicaciones(filtros, signal),
    placeholderData: keepPreviousData,
  })
}

/** Unidades de la tabla emergente. `enabled` evita pedirlas con el modal cerrado. */
export function useUnidadesPublicables(
  filtros: UnidadesPublicablesQuery,
  opciones?: { enabled?: boolean }
) {
  return useQuery<PaginatedResponse<UnidadPublicable>, ApiErrorResponse>({
    queryKey: PUBLICACIONES_QUERY_KEYS.UNIDADES_PUBLICABLES(filtros),
    queryFn: ({ signal }) => listarUnidadesPublicables(filtros, signal),
    placeholderData: keepPreviousData,
    enabled: opciones?.enabled ?? true,
  })
}

/** Detalle de una publicación. Con `id` en `null` la query queda deshabilitada. */
export function usePublicacionDetalle(id: number | null) {
  return useQuery<PublicacionDetalle, ApiErrorResponse>({
    queryKey: PUBLICACIONES_QUERY_KEYS.DETALLE(id),
    // El `!` es seguro: con `id` en `null` la query no corre (`enabled`).
    queryFn: ({ signal }) => obtenerPublicacion(id!, signal),
    enabled: id !== null,
  })
}

/** No muestra toast — eso lo decide quien la use. */
export function useCrearPublicacion() {
  const queryClient = useQueryClient()

  return useMutation<PublicacionDetalle, ApiErrorResponse, CrearPublicacionPayload>({
    mutationFn: crearPublicacion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicaciones'] })
    },
  })
}

/** Aun si falla (ej. 409 por estado cambiado) se invalida: el listado puede estar desactualizado. */
export function useDespublicarPublicacion() {
  const queryClient = useQueryClient()

  return useMutation<
    PublicacionDetalle,
    ApiErrorResponse,
    { id: number; payload: DespublicarPublicacionPayload }
  >({
    mutationFn: ({ id, payload }) => despublicarPublicacion(id, payload),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['publicaciones'] })
    },
  })
}
