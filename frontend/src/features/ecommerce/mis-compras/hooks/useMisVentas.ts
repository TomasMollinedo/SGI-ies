import { useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { listarMisVentas, MIS_VENTAS_QUERY_KEYS } from '../services/misVentas.service'
import type { MisVentasResponse } from '../types/miVenta.types'

/** Listado de las unidades del cliente autenticado, para la pantalla "Mis compras". */
export function useMisVentas() {
  return useQuery<MisVentasResponse, ApiErrorResponse>({
    queryKey: MIS_VENTAS_QUERY_KEYS.LISTA,
    queryFn: ({ signal }) => listarMisVentas(signal),
  })
}
