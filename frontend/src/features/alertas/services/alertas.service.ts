import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type { Alerta, FiltrosAlertas, TipoAlerta } from '../types/alertas.types'

export const ALERTAS_QUERY_KEYS = {
  LISTA: (filtros: FiltrosAlertas) => ['alertas', 'lista', filtros] as const,
  DETALLE: (id: number | null) => ['alertas', 'detalle', id] as const,
  TIPOS: ['alertas', 'tipos'] as const,
}

/** GET /alertas/tipos. Sin paginación: lista chica y estable. */
export async function listarTiposAlerta(signal?: AbortSignal): Promise<TipoAlerta[]> {
  const { data } = await httpClient.get<TipoAlerta[]>('/alertas/tipos', { signal })
  return data
}

/**
 * GET /alertas. Ya viene filtrada por el rol del usuario autenticado (o sin
 * filtrar si es Gerente General) — nunca hace falta mandar el rol acá.
 */
export async function listarAlertas(
  filtros: FiltrosAlertas,
  signal?: AbortSignal
): Promise<PaginatedResponse<Alerta>> {
  const { data } = await httpClient.get<PaginatedResponse<Alerta>>('/alertas', {
    params: {
      tipoAlertaId: filtros.tipoAlertaId,
      atendida: filtros.atendida,
      fechaDesde: filtros.fechaDesde,
      fechaHasta: filtros.fechaHasta,
      page: filtros.page,
      limit: filtros.limit,
    },
    signal,
  })
  return data
}

/** GET /alertas/{id}. 404 si no existe o no pertenece al rol del usuario (no 403). */
export async function obtenerAlerta(id: number, signal?: AbortSignal): Promise<Alerta> {
  const { data } = await httpClient.get<Alerta>(`/alertas/${id}`, { signal })
  return data
}

/** PATCH /alertas/{id}/atender. Sin body. 409 si ya estaba atendida. */
export async function atenderAlerta(id: number): Promise<Alerta> {
  const { data } = await httpClient.patch<Alerta>(`/alertas/${id}/atender`)
  return data
}
