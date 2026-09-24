import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { MIS_VENTAS_QUERY_KEYS, obtenerHistorialPagos } from '../services/misVentas.service'
import type { HistorialPagosResponse } from '../types/miVenta.types'

const LIMITE_PAGINA = 10

/**
 * Historial de pagos de una unidad, paginado. `keepPreviousData` deja la
 * página anterior a la vista mientras llega la nueva, igual que `useCatalogo`.
 *
 * `staleTime: 0` + refetch al montar, mismo criterio que `useVentaDetalle`:
 * Tesorería puede registrar o anular un cobro de esta unidad desde el panel
 * interno.
 */
export function useHistorialPagos(idVenta: number, page: number) {
  return useQuery<HistorialPagosResponse, ApiErrorResponse>({
    queryKey: MIS_VENTAS_QUERY_KEYS.HISTORIAL_PAGOS(idVenta, page),
    queryFn: ({ signal }) => obtenerHistorialPagos(idVenta, page, LIMITE_PAGINA, signal),
    enabled: Number.isInteger(idVenta) && idVenta > 0,
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}
