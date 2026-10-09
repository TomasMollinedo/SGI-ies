import { httpClient } from '@/shared/api/httpClient'
import type { PlanPago, PlanesPagoQuery } from '../types/planPago.types'

/**
 * LEGACY (ver `planPago.types.ts`): `/planes-pago` ya no existe en el backend.
 * Solo queda el listado porque el selector de plan de la venta todavía lo
 * pide; sale cuando T138 adapte la pantalla de venta.
 */
export const PLANES_PAGO_QUERY_KEYS = {
  LISTA: (filtros: PlanesPagoQuery) => ['planes-pago', 'lista', filtros] as const,
}

/** GET /planes-pago — los planes de una publicación, del más viejo al más nuevo. */
export async function listarPlanesPago(
  filtros: PlanesPagoQuery,
  signal?: AbortSignal
): Promise<PlanPago[]> {
  const { data } = await httpClient.get<PlanPago[]>('/planes-pago', {
    params: {
      FK_publicacion: filtros.FK_publicacion,
      estado: filtros.estado,
    },
    signal,
  })

  return data
}
