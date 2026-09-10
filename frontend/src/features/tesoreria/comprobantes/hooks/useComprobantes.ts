import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  COMPROBANTES_QUERY_KEYS,
  anularComprobante,
  confirmarComprobante,
  crearComprobante,
  editarComprobante,
  listarComprobantes,
  obtenerComprobante,
} from '../services/comprobantes.service'
import type {
  AnularComprobantePayload,
  Comprobante,
  ComprobanteDetalle,
  ComprobanteListItem,
  ComprobantesQuery,
  CrearComprobantePayload,
  EditarComprobantePayload,
} from '../types/comprobante.types'
/**
 * Listado paginado de comprobantes. Cada combinación de filtros es su propia
 * entrada de cache. `keepPreviousData` mantiene el paginador en pantalla
 * mientras llega la página siguiente.
 *
 * `opciones.enabled` deshabilita la query hasta que tenga sentido pedir (ej. el
 * selector de comprobante de origen no pide nada hasta que hay un proveedor
 * elegido).
 */
export function useComprobantes(filtros: ComprobantesQuery, opciones?: { enabled?: boolean }) {
  return useQuery<PaginatedResponse<ComprobanteListItem>, ApiErrorResponse>({
    queryKey: COMPROBANTES_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarComprobantes(filtros, signal),
    placeholderData: keepPreviousData,
    enabled: opciones?.enabled,
  })
}

/** Alta de un comprobante como BORRADOR. No muestra toast — eso lo decide quien la use. */
export function useCrearComprobante() {
  const queryClient = useQueryClient()

  return useMutation<Comprobante, ApiErrorResponse, CrearComprobantePayload>({
    mutationFn: crearComprobante,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comprobantes', 'lista'] })
    },
  })
}

/** Confirmación de un comprobante (BORRADOR → REGISTRADO). */
export function useConfirmarComprobante() {
  const queryClient = useQueryClient()

  return useMutation<Comprobante, ApiErrorResponse, number>({
    mutationFn: confirmarComprobante,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['comprobantes', 'lista'] })
      queryClient.invalidateQueries({ queryKey: COMPROBANTES_QUERY_KEYS.DETALLE(id) })
    },
  })
}

/**
 * Detalle de un comprobante. Con `id` en `null` (modal cerrado) la query queda
 * deshabilitada y, como el id es parte de la key, tampoco arrastra el detalle
 * del comprobante anterior.
 */
export function useComprobanteDetalle(id: number | null) {
  return useQuery<ComprobanteDetalle, ApiErrorResponse>({
    queryKey: COMPROBANTES_QUERY_KEYS.DETALLE(id),
    // El `!` es seguro: con `id` en `null` la query no corre (`enabled`).
    queryFn: ({ signal }) => obtenerComprobante(id!, signal),
    enabled: id !== null,
  })
}

/** Edición de un comprobante en BORRADOR. No muestra toast — eso lo decide quien la use. */
export function useEditarComprobante() {
  const queryClient = useQueryClient()

  return useMutation<
    Comprobante,
    ApiErrorResponse,
    { id: number; payload: EditarComprobantePayload }
  >({
    mutationFn: ({ id, payload }) => editarComprobante(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comprobantes', 'lista'] })
      queryClient.invalidateQueries({ queryKey: COMPROBANTES_QUERY_KEYS.DETALLE(variables.id) })
    },
  })
}

/** Anulación de un comprobante REGISTRADO. */
export function useAnularComprobante() {
  const queryClient = useQueryClient()

  return useMutation<
    Comprobante,
    ApiErrorResponse,
    { id: number; payload: AnularComprobantePayload }
  >({
    mutationFn: ({ id, payload }) => anularComprobante(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comprobantes', 'lista'] })
      queryClient.invalidateQueries({ queryKey: COMPROBANTES_QUERY_KEYS.DETALLE(variables.id) })
    },
  })
}