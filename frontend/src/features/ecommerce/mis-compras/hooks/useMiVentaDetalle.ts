import { useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { MIS_VENTAS_QUERY_KEYS, obtenerDetalleMiVenta } from '../services/misVentas.service'
import type { MiVentaDetalle } from '../types/miVenta.types'

/**
 * Detalle de una compra propia. `retry: false`: el 404 (no existe, no es de
 * este cliente, o no está vigente) es una respuesta válida que la pantalla
 * muestra como "no encontramos esta compra", no un fallo que convenga
 * reintentar.
 *
 * `staleTime: 0` + refetch al montar, mismo criterio que `useVentaDetalle`:
 * el saldo de cada cuota puede cambiar por un cobro que Tesorería registra o
 * anula desde el panel interno.
 */
export function useMiVentaDetalle(idVenta: number) {
  return useQuery<MiVentaDetalle, ApiErrorResponse>({
    queryKey: MIS_VENTAS_QUERY_KEYS.DETALLE(idVenta),
    queryFn: ({ signal }) => obtenerDetalleMiVenta(idVenta, signal),
    enabled: Number.isInteger(idVenta) && idVenta > 0,
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}
