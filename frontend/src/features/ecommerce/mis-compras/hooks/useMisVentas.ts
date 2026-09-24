import { useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { listarMisVentas, MIS_VENTAS_QUERY_KEYS } from '../services/misVentas.service'
import type { MisVentasResponse } from '../types/miVenta.types'

/**
 * Listado de las unidades del cliente autenticado, para la pantalla "Mis
 * compras". `staleTime: 0` + refetch al montar, mismo criterio que
 * `useVentaDetalle`: el saldo y la alerta de cuotas vencidas pueden cambiar
 * por un cobro que Tesorería registra o anula desde el panel interno.
 */
export function useMisVentas() {
  return useQuery<MisVentasResponse, ApiErrorResponse>({
    queryKey: MIS_VENTAS_QUERY_KEYS.LISTA,
    queryFn: ({ signal }) => listarMisVentas(signal),
    staleTime: 0,
    refetchOnMount: 'always',
  })
}
