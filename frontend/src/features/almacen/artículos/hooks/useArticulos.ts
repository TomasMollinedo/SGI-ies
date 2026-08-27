import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  ARTICULOS_QUERY_KEYS,
  crearArticulo,
  darDeBajaArticulo,
  editarArticulo,
  listarArticulos,
  obtenerArticulo,
  reactivarArticulo,
} from '../services/articulos.service'
import type {
  Articulo,
  ArticuloAuditada,
  ArticuloDetalle,
  ArticulosQuery,
  CrearArticuloPayload,
  EditarArticuloPayload,
} from '../types/articulo.types'

/**
 * Listado paginado de artículos. Cada combinación de filtros es su propia
 * entrada de cache, así que una respuesta vieja nunca puede pisar a la actual.
 *
 * `keepPreviousData` mantiene el paginador en pantalla mientras llega la página
 * siguiente: sin eso, `meta` desaparecería y el pie de la tabla saltaría.
 */
export function useArticulos(filtros: ArticulosQuery) {
  return useQuery<PaginatedResponse<Articulo>, ApiErrorResponse>({
    queryKey: ARTICULOS_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarArticulos(filtros, signal),
    placeholderData: keepPreviousData,
  })
}

/**
 * Detalle de un artículo. Con `id` en `null` (modal cerrado) la query queda
 * deshabilitada y, como el id es parte de la key, tampoco arrastra el estado
 * del artículo anterior.
 */
export function useArticuloDetalle(id: number | null) {
  return useQuery<ArticuloDetalle, ApiErrorResponse>({
    queryKey: ARTICULOS_QUERY_KEYS.DETALLE(id),
    // El `!` es seguro: con `id` en `null` la query no corre (`enabled`).
    queryFn: ({ signal }) => obtenerArticulo(id!, signal),
    enabled: id !== null,
  })
}

/** Las mutaciones invalidan el listado; no muestran toasts — eso lo decide quien las use. */

export function useCrearArticulo() {
  const queryClient = useQueryClient()

  return useMutation<ArticuloAuditada, ApiErrorResponse, CrearArticuloPayload>({
    mutationFn: crearArticulo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articulos', 'lista'] })
    },
  })
}

export function useEditarArticulo() {
  const queryClient = useQueryClient()

  return useMutation<
    ArticuloAuditada,
    ApiErrorResponse,
    { id: number; payload: EditarArticuloPayload }
  >({
    mutationFn: ({ id, payload }) => editarArticulo(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['articulos', 'lista'] })
      queryClient.invalidateQueries({ queryKey: ARTICULOS_QUERY_KEYS.DETALLE(variables.id) })
    },
  })
}

/**
 * Baja y reactivación comparten forma: reciben el id, no llevan body y al
 * terminar invalidan el listado — que se vuelve a pedir con la página y los
 * filtros que estaban puestos, porque son parte de la query key.
 */

export function useDarDeBajaArticulo() {
  const queryClient = useQueryClient()

  return useMutation<ArticuloAuditada, ApiErrorResponse, number>({
    mutationFn: darDeBajaArticulo,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['articulos', 'lista'] })
      queryClient.invalidateQueries({ queryKey: ARTICULOS_QUERY_KEYS.DETALLE(id) })
    },
  })
}

export function useReactivarArticulo() {
  const queryClient = useQueryClient()

  return useMutation<ArticuloAuditada, ApiErrorResponse, number>({
    mutationFn: reactivarArticulo,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['articulos', 'lista'] })
      queryClient.invalidateQueries({ queryKey: ARTICULOS_QUERY_KEYS.DETALLE(id) })
    },
  })
}
