import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  ALERTAS_QUERY_KEYS,
  atenderAlerta,
  listarAlertas,
  listarTiposAlerta,
  obtenerAlerta,
} from '../services/alertas.service'
import type { Alerta, FiltrosAlertas, TipoAlerta } from '../types/alertas.types'

/** Tipos de alerta para poblar el filtro. Lista chica y estable: no se repagina ni se filtra. */
export function useTiposAlerta() {
  return useQuery<TipoAlerta[], ApiErrorResponse>({
    queryKey: ALERTAS_QUERY_KEYS.TIPOS,
    queryFn: ({ signal }) => listarTiposAlerta(signal),
  })
}

/** placeholderData: keepPreviousData evita el flash de loading al cambiar de página o filtro. */
export function useAlertas(filtros: FiltrosAlertas) {
  return useQuery<PaginatedResponse<Alerta>, ApiErrorResponse>({
    queryKey: ALERTAS_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarAlertas(filtros, signal),
    placeholderData: keepPreviousData,
  })
}

export function useAlertaDetalle(id: number | null) {
  return useQuery<Alerta, ApiErrorResponse>({
    queryKey: ALERTAS_QUERY_KEYS.DETALLE(id),
    queryFn: ({ signal }) => obtenerAlerta(id as number, signal),
    enabled: id !== null,
  })
}

/** Cuántas alertas pendientes trae la campanita como vista rápida. */
const LIMITE_PENDIENTES_CAMPANITA = 10

/**
 * Vista rápida de la campanita: últimas pendientes. No hay push, así que se
 * refresca por polling cada 60s y al volver el foco a la pestaña — acá se pisa
 * puntualmente el `refetchOnWindowFocus: false` global de `QueryProvider`.
 */
export function useAlertasPendientes() {
  const filtros = { atendida: false, limit: LIMITE_PENDIENTES_CAMPANITA }

  return useQuery<PaginatedResponse<Alerta>, ApiErrorResponse>({
    queryKey: ALERTAS_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarAlertas(filtros, signal),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}

/** No dispara toasts ni maneja el 409 acá — eso lo decide quien la use. */
export function useAtenderAlerta() {
  const queryClient = useQueryClient()

  return useMutation<Alerta, ApiErrorResponse, number>({
    mutationFn: atenderAlerta,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['alertas', 'lista'] })
      queryClient.invalidateQueries({ queryKey: ALERTAS_QUERY_KEYS.DETALLE(id) })
    },
  })
}
