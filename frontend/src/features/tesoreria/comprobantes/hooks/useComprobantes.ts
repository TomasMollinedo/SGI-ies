import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  COMPROBANTES_QUERY_KEYS,
  confirmarComprobante,
  crearComprobante,
  listarComprobantes,
} from '../services/comprobantes.service'
import type {
  Comprobante,
  ComprobanteListItem,
  ComprobantesQuery,
  CrearComprobantePayload,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comprobantes', 'lista'] })
    },
  })
}