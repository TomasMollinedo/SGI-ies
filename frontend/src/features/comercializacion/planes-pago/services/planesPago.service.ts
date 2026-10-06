import { httpClient } from '@/shared/api/httpClient'
import type {
  CrearPlanPagoPayload,
  CuotaSimulada,
  EditarPlanPagoPayload,
  PlanPago,
  PlanPagoActualizado,
  PlanPagoCreado,
  PlanesPagoQuery,
  SimularCuotasPayload,
} from '../types/planPago.types'

export const PLANES_PAGO_QUERY_KEYS = {
  /** Todo lo de planes de pago, para invalidar de una. */
  RAIZ: ['planes-pago'] as const,
  LISTA: (filtros: PlanesPagoQuery) => ['planes-pago', 'lista', filtros] as const,
  DETALLE: (id: number | null) => ['planes-pago', 'detalle', id] as const,
}

/**
 * GET /planes-pago — los planes de una publicación, del más viejo al más
 * nuevo (el orden lo define el backend). `FK_publicacion` es obligatorio: no
 * existe un listado global de planes.
 *
 * Sin paginación, igual que el backend: los planes de una publicación son
 * pocos por diseño.
 */
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

/** GET /planes-pago/:id — el detalle que precarga el formulario de edición. */
export async function obtenerPlanPago(id: number, signal?: AbortSignal): Promise<PlanPago> {
  const { data } = await httpClient.get<PlanPago>(`/planes-pago/${id}`, { signal })
  return data
}

/**
 * POST /planes-pago — el plan nace activo. Si es el primero activo de una
 * publicación EN_PREPARACION, la publicación pasa a DISPONIBLE (lo hace el
 * backend, en la misma transacción).
 *
 * La respuesta puede traer `warning` si el precio quedó por debajo del costo:
 * es informativo y posterior, el plan ya se creó.
 */
export async function crearPlanPago(payload: CrearPlanPagoPayload): Promise<PlanPagoCreado> {
  const { data } = await httpClient.post<PlanPagoCreado>('/planes-pago', payload)
  return data
}

/**
 * PATCH /planes-pago/:id — precio, porcentaje, margen y estado. Las
 * condiciones estructurales no se editan (400).
 *
 * Devuelve el plan, no la publicación: si el cambio de estado arrastró el
 * `estado_comercial` (al inactivar el último plan activo vuelve a
 * EN_PREPARACION), eso hay que releerlo del detalle de la publicación.
 */
export async function editarPlanPago(
  id: number,
  payload: EditarPlanPagoPayload
): Promise<PlanPagoActualizado> {
  const { data } = await httpClient.patch<PlanPagoActualizado>(`/planes-pago/${id}`, payload)
  return data
}

/**
 * POST /planes-pago/simular-cuotas — previsualización, no persiste nada.
 *
 * Es la ÚNICA forma de armar el cronograma: el cálculo (división, redondeo y
 * el caso del día 31) vive en `motor-cuotas.ts` y no se reimplementa acá, para
 * que la previsualización no se desincronice de las cuotas que después se
 * generan de verdad.
 */
export async function simularCuotas(payload: SimularCuotasPayload): Promise<CuotaSimulada[]> {
  const { data } = await httpClient.post<CuotaSimulada[]>('/planes-pago/simular-cuotas', payload)
  return data
}
