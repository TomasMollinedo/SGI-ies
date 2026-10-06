import { useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import {
  DECLARACIONES_PAGO_QUERY_KEYS,
  listarFormasPagoAutogestion,
} from '../services/declaracionesPago.service'
import type { FormaPagoAutogestion } from '../types/declaracionPago.types'

/**
 * Formas de pago con las que el cliente puede declarar un pago. Una lista
 * vacía es una respuesta válida: no hay ninguna habilitada y el pago tiene
 * que hacerse de forma presencial.
 */
export function useFormasPagoAutogestion() {
  return useQuery<FormaPagoAutogestion[], ApiErrorResponse>({
    queryKey: DECLARACIONES_PAGO_QUERY_KEYS.FORMAS_PAGO,
    queryFn: ({ signal }) => listarFormasPagoAutogestion(signal),
  })
}
