import { httpClient } from '@/shared/api/httpClient'
import type {
  CrearPlanEjemploPayload,
  EditarPlanEjemploPayload,
  PlanEjemplo,
  PlanesEjemploQuery,
  SimulacionPlanEjemplo,
  SimularPlanEjemploPayload,
} from '../types/planEjemplo.types'

export const PLANES_EJEMPLO_QUERY_KEYS = {
  /** Todo lo de planes de ejemplo, para invalidar de una. */
  RAIZ: ['planes-ejemplo'] as const,
  LISTA: (filtros: PlanesEjemploQuery) => ['planes-ejemplo', 'lista', filtros] as const,
  SIMULACION: (payload: SimularPlanEjemploPayload | null) =>
    ['planes-ejemplo', 'simulacion', payload] as const,
}

/**
 * GET /planes-ejemplo — los planes de una publicación, del más viejo al más
 * nuevo, con sus importes calculados. `FK_publicacion` es obligatorio: no
 * existe un listado global. Los planes cuyo plazo está dado de baja no se
 * devuelven.
 *
 * Sin paginación, igual que el backend: son pocos por publicación.
 */
export async function listarPlanesEjemplo(
  filtros: PlanesEjemploQuery,
  signal?: AbortSignal
): Promise<PlanEjemplo[]> {
  const { data } = await httpClient.get<PlanEjemplo[]>('/planes-ejemplo', {
    params: { FK_publicacion: filtros.FK_publicacion, estado: filtros.estado },
    signal,
  })

  return data
}

/** POST /planes-ejemplo — solo con la publicación Disponible y un plazo activo. El plan nace activo. */
export async function crearPlanEjemplo(payload: CrearPlanEjemploPayload): Promise<PlanEjemplo> {
  const { data } = await httpClient.post<PlanEjemplo>('/planes-ejemplo', payload)
  return data
}

/** PATCH /planes-ejemplo/:id — nombre, anticipo, plazo y estado. También exige la publicación Disponible. */
export async function editarPlanEjemplo(
  id: number,
  payload: EditarPlanEjemploPayload
): Promise<PlanEjemplo> {
  const { data } = await httpClient.patch<PlanEjemplo>(`/planes-ejemplo/${id}`, payload)
  return data
}

/**
 * POST /planes-ejemplo/simular — los importes de un plan mientras se arma, sin
 * guardar nada. Es la ÚNICA fuente de esos números: el precio de lista y la TNA
 * se leen de la base, así que lo que se ve es exactamente lo que va a mostrar
 * el plan una vez guardado.
 */
export async function simularPlanEjemplo(
  payload: SimularPlanEjemploPayload,
  signal?: AbortSignal
): Promise<SimulacionPlanEjemplo> {
  const { data } = await httpClient.post<SimulacionPlanEjemplo>(
    '/planes-ejemplo/simular',
    payload,
    { signal }
  )

  return data
}
