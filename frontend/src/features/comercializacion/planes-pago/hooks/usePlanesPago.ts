import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import {
  PLANES_PAGO_QUERY_KEYS,
  crearPlanPago,
  editarPlanPago,
  listarPlanesPago,
  obtenerPlanPago,
  simularCuotas,
} from '../services/planesPago.service'
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

/**
 * Alta y edición pueden cambiar el `estado_comercial` de la publicación
 * (primer plan activo → DISPONIBLE, último inactivado → EN_PREPARACION), y ese
 * dato se muestra arriba de la pantalla leyéndolo del detalle de la
 * publicación. Por eso toda mutación invalida también `['publicaciones']`: si
 * no, la cabecera seguiría mostrando el estado viejo.
 */
function useInvalidarPlanesYPublicaciones() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: PLANES_PAGO_QUERY_KEYS.RAIZ })
    queryClient.invalidateQueries({ queryKey: ['publicaciones'] })
  }
}

/** Los planes de una publicación. Con `FK_publicacion` en `null` la query no corre. */
export function usePlanesPago(filtros: PlanesPagoQuery | null) {
  return useQuery<PlanPago[], ApiErrorResponse>({
    queryKey: PLANES_PAGO_QUERY_KEYS.LISTA(filtros ?? { FK_publicacion: 0 }),
    // El `!` es seguro: con `filtros` en `null` la query no corre (`enabled`).
    queryFn: ({ signal }) => listarPlanesPago(filtros!, signal),
    enabled: filtros !== null,
  })
}

/**
 * El plan que precarga el formulario de edición. Con `id` en `null` la query
 * queda deshabilitada (el modal cerrado no pide nada).
 *
 * `staleTime: 0` + refetch al montar, igual que el detalle de publicación: el
 * precio pudo cambiarlo otro usuario desde que se cargó el listado.
 */
export function usePlanPagoDetalle(id: number | null) {
  return useQuery<PlanPago, ApiErrorResponse>({
    queryKey: PLANES_PAGO_QUERY_KEYS.DETALLE(id),
    queryFn: ({ signal }) => obtenerPlanPago(id!, signal),
    enabled: id !== null,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

/** No muestra toast ni cierra nada: eso lo decide quien la use. */
export function useCrearPlanPago() {
  const invalidar = useInvalidarPlanesYPublicaciones()

  return useMutation<PlanPagoCreado, ApiErrorResponse, CrearPlanPagoPayload>({
    mutationFn: crearPlanPago,
    onSuccess: invalidar,
  })
}

/**
 * Sirve para las dos cosas que edita el PATCH: las condiciones económicas
 * (precio, porcentaje, margen) y el activar/inactivar.
 *
 * Se invalida con `onSettled` y no con `onSuccess` porque si falla por un 409
 * —la publicación pasó a tener una venta mientras el modal estaba abierto— lo
 * que hay en pantalla ya quedó viejo igual.
 */
export function useEditarPlanPago() {
  const invalidar = useInvalidarPlanesYPublicaciones()

  return useMutation<
    PlanPagoActualizado,
    ApiErrorResponse,
    { id: number; payload: EditarPlanPagoPayload }
  >({
    mutationFn: ({ id, payload }) => editarPlanPago(id, payload),
    onSettled: invalidar,
  })
}

/**
 * La previsualización del cronograma. Es una mutación y no una query a
 * propósito: se dispara con el botón "Previsualizar cuotas", no al tipear.
 *
 * `reset()` es lo que usa el formulario para invalidar una previsualización
 * que quedó vieja cuando se tocan las condiciones.
 */
export function useSimularCuotas() {
  return useMutation<CuotaSimulada[], ApiErrorResponse, SimularCuotasPayload>({
    mutationFn: simularCuotas,
  })
}
