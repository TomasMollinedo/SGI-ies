import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  PLAZOS_FINANCIACION_QUERY_KEYS,
  crearPlazoFinanciacion,
  darDeBajaPlazoFinanciacion,
  editarPlazoFinanciacion,
  listarCatalogoPlazosFinanciacion,
  listarPlazosFinanciacion,
  obtenerPlazoFinanciacion,
  reactivarPlazoFinanciacion,
} from '../services/plazosFinanciacion.service'
import type {
  CrearPlazoFinanciacionPayload,
  EditarPlazoFinanciacionPayload,
  PlazoFinanciacion,
  PlazoFinanciacionAuditado,
  PlazoFinanciacionCatalogoItem,
  PlazoFinanciacionDetalle,
  PlazosFinanciacionQuery,
} from '../types/plazoFinanciacion.types'

/** Prefijo común del listado: invalidarlo vuelve a pedir cualquier página y filtro. */
const LISTA_KEY = ['plazos-financiacion', 'lista'] as const

/**
 * Listado paginado. Cada combinación de filtros es su propia entrada de cache,
 * así que una respuesta vieja nunca pisa a la actual; `keepPreviousData` deja
 * el paginador en pantalla mientras llega la página siguiente.
 */
export function usePlazosFinanciacion(filtros: PlazosFinanciacionQuery) {
  return useQuery<PaginatedResponse<PlazoFinanciacion>, ApiErrorResponse>({
    queryKey: PLAZOS_FINANCIACION_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarPlazosFinanciacion(filtros, signal),
    placeholderData: keepPreviousData,
  })
}

/**
 * Detalle de un plazo, para el modo lectura. Con `id` en `null` la query queda
 * deshabilitada y, como el id es parte de la key, tampoco arrastra el detalle
 * del plazo anterior.
 */
export function usePlazoFinanciacionDetalle(id: number | null) {
  return useQuery<PlazoFinanciacionDetalle, ApiErrorResponse>({
    queryKey: PLAZOS_FINANCIACION_QUERY_KEYS.DETALLE(id),
    // El `!` es seguro: con `id` en `null` la query no corre (`enabled`).
    queryFn: ({ signal }) => obtenerPlazoFinanciacion(id!, signal),
    enabled: id !== null,
  })
}

/** Las mutaciones invalidan el listado; no muestran toasts — eso lo decide quien las use. */

export function useCrearPlazoFinanciacion() {
  const queryClient = useQueryClient()

  return useMutation<PlazoFinanciacionAuditado, ApiErrorResponse, CrearPlazoFinanciacionPayload>({
    mutationFn: crearPlazoFinanciacion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LISTA_KEY })
    },
  })
}

export function useEditarPlazoFinanciacion() {
  const queryClient = useQueryClient()

  return useMutation<
    PlazoFinanciacionAuditado,
    ApiErrorResponse,
    { id: number; payload: EditarPlazoFinanciacionPayload }
  >({
    mutationFn: ({ id, payload }) => editarPlazoFinanciacion(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: LISTA_KEY })
      queryClient.invalidateQueries({
        queryKey: PLAZOS_FINANCIACION_QUERY_KEYS.DETALLE(variables.id),
      })
    },
  })
}

/**
 * Baja y reactivación comparten forma: reciben el id, no llevan body y al
 * terminar invalidan el listado y el detalle de ese plazo.
 */

export function useDarDeBajaPlazoFinanciacion() {
  const queryClient = useQueryClient()

  return useMutation<PlazoFinanciacionAuditado, ApiErrorResponse, number>({
    mutationFn: darDeBajaPlazoFinanciacion,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: LISTA_KEY })
      queryClient.invalidateQueries({ queryKey: PLAZOS_FINANCIACION_QUERY_KEYS.DETALLE(id) })
    },
  })
}

/** Catálogo de plazos activos, para el `<select>` del simulador de la venta y de los planes de ejemplo. */
export function usePlazosFinanciacionCatalogo() {
  return useQuery<PlazoFinanciacionCatalogoItem[], ApiErrorResponse>({
    queryKey: PLAZOS_FINANCIACION_QUERY_KEYS.CATALOGO,
    queryFn: ({ signal }) => listarCatalogoPlazosFinanciacion(signal),
  })
}

export function useReactivarPlazoFinanciacion() {
  const queryClient = useQueryClient()

  return useMutation<PlazoFinanciacionAuditado, ApiErrorResponse, number>({
    mutationFn: reactivarPlazoFinanciacion,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: LISTA_KEY })
      queryClient.invalidateQueries({ queryKey: PLAZOS_FINANCIACION_QUERY_KEYS.DETALLE(id) })
    },
  })
}
