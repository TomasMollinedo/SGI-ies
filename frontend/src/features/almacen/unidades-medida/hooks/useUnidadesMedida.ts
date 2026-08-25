import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  UNIDADES_MEDIDA_QUERY_KEYS,
  crearUnidadMedida,
  darDeBajaUnidadMedida,
  editarUnidadMedida,
  listarUnidadesMedida,
  obtenerUnidadMedida,
  reactivarUnidadMedida,
} from '../services/unidadesMedida.service'
import type {
  CrearUnidadMedidaPayload,
  EditarUnidadMedidaPayload,
  FiltrosUnidadesMedida,
  UnidadMedida,
  UnidadMedidaAuditada,
  UnidadMedidaDetalle,
} from '../types/unidadMedida.types'

/** placeholderData: keepPreviousData evita el flash de loading al cambiar de página o filtro. */
export function useUnidadesMedida(filtros: FiltrosUnidadesMedida) {
  return useQuery<PaginatedResponse<UnidadMedida>, ApiErrorResponse>({
    queryKey: UNIDADES_MEDIDA_QUERY_KEYS.LISTA(filtros),
    queryFn: () => listarUnidadesMedida(filtros),
    placeholderData: keepPreviousData,
  })
}

export function useUnidadMedidaDetalle(id: number | null) {
  return useQuery<UnidadMedidaDetalle, ApiErrorResponse>({
    queryKey: UNIDADES_MEDIDA_QUERY_KEYS.DETALLE(id ?? -1),
    queryFn: () => obtenerUnidadMedida(id as number),
    enabled: id !== null,
  })
}

/** Las 4 mutaciones invalidan el listado; no muestran toasts — eso lo decide quien las use. */

export function useCrearUnidadMedida() {
  const queryClient = useQueryClient()
  return useMutation<UnidadMedidaAuditada, ApiErrorResponse, CrearUnidadMedidaPayload>({
    mutationFn: crearUnidadMedida,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades-medida', 'lista'] })
    },
  })
}

export function useEditarUnidadMedida() {
  const queryClient = useQueryClient()
  return useMutation<
    UnidadMedidaAuditada,
    ApiErrorResponse,
    { id: number; payload: EditarUnidadMedidaPayload }
  >({
    mutationFn: ({ id, payload }) => editarUnidadMedida(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['unidades-medida', 'lista'] })
      queryClient.invalidateQueries({ queryKey: UNIDADES_MEDIDA_QUERY_KEYS.DETALLE(variables.id) })
    },
  })
}

export function useDarDeBajaUnidadMedida() {
  const queryClient = useQueryClient()
  return useMutation<UnidadMedidaAuditada, ApiErrorResponse, number>({
    mutationFn: darDeBajaUnidadMedida,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['unidades-medida', 'lista'] })
      queryClient.invalidateQueries({ queryKey: UNIDADES_MEDIDA_QUERY_KEYS.DETALLE(id) })
    },
  })
}

export function useReactivarUnidadMedida() {
  const queryClient = useQueryClient()
  return useMutation<UnidadMedidaAuditada, ApiErrorResponse, number>({
    mutationFn: reactivarUnidadMedida,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['unidades-medida', 'lista'] })
      queryClient.invalidateQueries({ queryKey: UNIDADES_MEDIDA_QUERY_KEYS.DETALLE(id) })
    },
  })
}
