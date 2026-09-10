import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { cambiarEstadoOrdenCompra, crearOrdenCompra } from '../services/ordenesCompra.service'
import type {
  CambiarEstadoOrdenCompraPayload,
  CrearOrdenCompraPayload,
  OrdenCompra,
} from '../types/ordenCompra.types'

/** No muestra toast — eso lo decide quien la use. */
export function useCrearOrdenCompra() {
  const queryClient = useQueryClient()

  return useMutation<OrdenCompra, ApiErrorResponse, CrearOrdenCompraPayload>({
    mutationFn: crearOrdenCompra,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] })
    },
  })
}

export function useCambiarEstadoOrdenCompra() {
  const queryClient = useQueryClient()

  return useMutation<
    OrdenCompra,
    ApiErrorResponse,
    { id: number; payload: CambiarEstadoOrdenCompraPayload }
  >({
    mutationFn: ({ id, payload }) => cambiarEstadoOrdenCompra(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] })
    },
  })
}
