import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  DEPOSITOS_QUERY_KEYS,
  crearDeposito,
  darDeBajaDeposito,
  editarDeposito,
  listarDepositos,
  obtenerDeposito,
  reactivarDeposito,
} from '../services/depositos.service'
import type {
  CrearDepositoPayload,
  Deposito,
  DepositoAuditado,
  DepositoDetalle,
  EditarDepositoPayload,
  FiltrosDepositos,
} from '../types/deposito.types'

/** placeholderData: keepPreviousData evita el flash de loading al cambiar de página o filtro. */
export function useDepositos(filtros: FiltrosDepositos) {
  return useQuery<PaginatedResponse<Deposito>, ApiErrorResponse>({
    queryKey: DEPOSITOS_QUERY_KEYS.LISTA(filtros),
    queryFn: () => listarDepositos(filtros),
    placeholderData: keepPreviousData,
  })
}

export function useDepositoDetalle(id: number | null) {
  return useQuery<DepositoDetalle, ApiErrorResponse>({
    queryKey: DEPOSITOS_QUERY_KEYS.DETALLE(id ?? -1),
    queryFn: () => obtenerDeposito(id as number),
    enabled: id !== null,
  })
}

/** Las 4 mutaciones invalidan el listado; no muestran toasts — eso lo decide quien las use. */

export function useCrearDeposito() {
  const queryClient = useQueryClient()

  return useMutation<DepositoAuditado, ApiErrorResponse, CrearDepositoPayload>({
    mutationFn: crearDeposito,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depositos', 'lista'] })
    },
  })
}

export function useEditarDeposito() {
  const queryClient = useQueryClient()

  return useMutation<
    DepositoAuditado,
    ApiErrorResponse,
    { id: number; payload: EditarDepositoPayload }
  >({
    mutationFn: ({ id, payload }) => editarDeposito(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['depositos', 'lista'] })
      queryClient.invalidateQueries({ queryKey: DEPOSITOS_QUERY_KEYS.DETALLE(variables.id) })
    },
  })
}

export function useDarDeBajaDeposito() {
  const queryClient = useQueryClient()

  return useMutation<DepositoAuditado, ApiErrorResponse, number>({
    mutationFn: darDeBajaDeposito,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['depositos', 'lista'] })
      queryClient.invalidateQueries({ queryKey: DEPOSITOS_QUERY_KEYS.DETALLE(id) })
    },
  })
}

export function useReactivarDeposito() {
  const queryClient = useQueryClient()

  return useMutation<DepositoAuditado, ApiErrorResponse, number>({
    mutationFn: reactivarDeposito,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['depositos', 'lista'] })
      queryClient.invalidateQueries({ queryKey: DEPOSITOS_QUERY_KEYS.DETALLE(id) })
    },
  })
}
