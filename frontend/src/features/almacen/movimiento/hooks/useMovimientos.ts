import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { crearMovimiento } from '../services/movimientos.service'
import type { CrearMovimientoPayload, MovimientoCreado } from '../types/movimiento.types'

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
