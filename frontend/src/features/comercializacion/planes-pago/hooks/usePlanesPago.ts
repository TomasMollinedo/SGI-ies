import { useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { PLANES_PAGO_QUERY_KEYS, listarPlanesPago } from '../services/planesPago.service'
import type { PlanPago, PlanesPagoQuery } from '../types/planPago.types'

/**
 * LEGACY (ver `planPago.types.ts`): lo usa el selector de plan de la venta
 * hasta que T138 lo adapte. La pantalla de planes usa `usePlanesEjemplo`.
 */
export function usePlanesPago(filtros: PlanesPagoQuery | null) {
  return useQuery<PlanPago[], ApiErrorResponse>({
    queryKey: PLANES_PAGO_QUERY_KEYS.LISTA(filtros ?? { FK_publicacion: 0 }),
    // El `!` es seguro: con `filtros` en `null` la query no corre (`enabled`).
    queryFn: ({ signal }) => listarPlanesPago(filtros!, signal),
    enabled: filtros !== null,
  })
}
