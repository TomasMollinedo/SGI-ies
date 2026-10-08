import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import {
  PLANES_EJEMPLO_QUERY_KEYS,
  crearPlanEjemplo,
  editarPlanEjemplo,
  listarPlanesEjemplo,
  simularPlanEjemplo,
} from '../services/planesEjemplo.service'
import type {
  CrearPlanEjemploPayload,
  EditarPlanEjemploPayload,
  PlanEjemplo,
  PlanesEjemploQuery,
  SimulacionPlanEjemplo,
  SimularPlanEjemploPayload,
} from '../types/planEjemplo.types'

/**
 * Los planes de una publicación. Con `filtros` en `null` la query no corre.
 *
 * `refetchOnMount: 'always'` porque los importes dependen del precio de lista
 * y de la TNA, que se cambian en otras pantallas (el detalle de la publicación
 * y Plazos de Financiación): con el `staleTime` global, volver acá dentro del
 * minuto mostraría importes viejos.
 */
export function usePlanesEjemplo(filtros: PlanesEjemploQuery | null) {
  return useQuery<PlanEjemplo[], ApiErrorResponse>({
    queryKey: PLANES_EJEMPLO_QUERY_KEYS.LISTA(filtros ?? { FK_publicacion: 0 }),
    // El `!` es seguro: con `filtros` en `null` la query no corre (`enabled`).
    queryFn: ({ signal }) => listarPlanesEjemplo(filtros!, signal),
    enabled: filtros !== null,
    refetchOnMount: 'always',
  })
}

/** No muestra toast ni cierra nada: eso lo decide quien la use. */
export function useCrearPlanEjemplo() {
  const queryClient = useQueryClient()

  return useMutation<PlanEjemplo, ApiErrorResponse, CrearPlanEjemploPayload>({
    mutationFn: crearPlanEjemplo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLANES_EJEMPLO_QUERY_KEYS.RAIZ }),
  })
}

/**
 * Sirve para las dos cosas que edita el PATCH: las condiciones del plan y el
 * activar/inactivar. Se invalida con `onSettled` y no con `onSuccess` porque
 * si falla por un 409 —la publicación dejó de estar Disponible mientras el
 * modal estaba abierto— lo que hay en pantalla ya quedó viejo igual.
 */
export function useEditarPlanEjemplo() {
  const queryClient = useQueryClient()

  return useMutation<
    PlanEjemplo,
    ApiErrorResponse,
    { id: number; payload: EditarPlanEjemploPayload }
  >({
    mutationFn: ({ id, payload }) => editarPlanEjemplo(id, payload),
    onSettled: () => queryClient.invalidateQueries({ queryKey: PLANES_EJEMPLO_QUERY_KEYS.RAIZ }),
  })
}

/**
 * Los importes en vivo de un plan mientras se arma. Es una query y no una
 * mutación aunque sea un POST: no escribe nada, y así React Query cancela el
 * pedido anterior cuando cambian las condiciones y deduplica los repetidos.
 *
 * Con `payload` en `null` (condiciones todavía incompletas o inválidas) no
 * corre. `keepPreviousData` deja en pantalla los importes anteriores mientras
 * llegan los nuevos, para que el panel no parpadee en cada cambio.
 */
export function useSimularPlanEjemplo(payload: SimularPlanEjemploPayload | null) {
  return useQuery<SimulacionPlanEjemplo, ApiErrorResponse>({
    queryKey: PLANES_EJEMPLO_QUERY_KEYS.SIMULACION(payload),
    // El `!` es seguro: con `payload` en `null` la query no corre (`enabled`).
    queryFn: ({ signal }) => simularPlanEjemplo(payload!, signal),
    enabled: payload !== null,
    placeholderData: keepPreviousData,
  })
}
