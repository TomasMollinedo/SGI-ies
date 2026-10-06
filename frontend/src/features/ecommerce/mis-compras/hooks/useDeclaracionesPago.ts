import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import {
  DECLARACIONES_PAGO_QUERY_KEYS,
  declararPago,
  listarDeclaracionesPago,
} from '../services/declaracionesPago.service'
import { MIS_VENTAS_QUERY_KEYS } from '../services/misVentas.service'
import type {
  DeclaracionesPagoClienteResponse,
  DeclararPagoPayload,
} from '../types/declaracionPago.types'

export const LIMITE_PAGINA_DECLARACIONES = 10

/** Declaraciones de pago de una unidad, paginadas. Mismo criterio que `useHistorialPagos`. */
export function useDeclaracionesPago(idVenta: number, page: number) {
  return useQuery<DeclaracionesPagoClienteResponse, ApiErrorResponse>({
    queryKey: DECLARACIONES_PAGO_QUERY_KEYS.DECLARACIONES(idVenta, page),
    queryFn: ({ signal }) =>
      listarDeclaracionesPago(idVenta, page, LIMITE_PAGINA_DECLARACIONES, signal),
    enabled: Number.isInteger(idVenta) && idVenta > 0,
    placeholderData: keepPreviousData,
  })
}

/**
 * Declara un pago sobre una cuota de esta venta. No muestra toast — eso lo
 * decide quien la use. Invalida el detalle (por si la cuota cambió mientras
 * tanto) y las declaraciones de la venta, donde la nueva aparece PENDIENTE.
 * El saldo de la cuota no cambia: eso pasa recién si Tesorería la valida.
 *
 * Un 409 (venta cancelada, cuota que ya no está pendiente ni parcial, forma de
 * pago que dejó de estar habilitada) significa que lo que el cliente tiene en
 * pantalla quedó viejo: se refresca el detalle y el catálogo de formas.
 */
export function useDeclararPago(idVenta: number) {
  const queryClient = useQueryClient()

  return useMutation<void, ApiErrorResponse, DeclararPagoPayload>({
    mutationFn: declararPago,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MIS_VENTAS_QUERY_KEYS.DETALLE(idVenta) })
      queryClient.invalidateQueries({
        queryKey: DECLARACIONES_PAGO_QUERY_KEYS.DECLARACIONES_VENTA(idVenta),
      })
    },
    onError: (error) => {
      if (error.statusCode !== 409) return
      queryClient.invalidateQueries({ queryKey: MIS_VENTAS_QUERY_KEYS.DETALLE(idVenta) })
      queryClient.invalidateQueries({ queryKey: DECLARACIONES_PAGO_QUERY_KEYS.FORMAS_PAGO })
    },
  })
}
