import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type {
  CrearMovimientoPayload,
  Movimiento,
  MovimientoCreado,
  MovimientoDetalle,
  MovimientosQuery,
} from '../types/movimiento.types'

export const MOVIMIENTOS_QUERY_KEYS = {
  LISTA: (filtros: MovimientosQuery) => ['movimientos', 'lista', filtros] as const,
  DETALLE: (id: number | null) => ['movimientos', 'detalle', id] as const,
}

/** POST /movimientos — registra el movimiento y actualiza el stock de cada ficha del detalle. */
export async function crearMovimiento(payload: CrearMovimientoPayload): Promise<MovimientoCreado> {
  const { data } = await httpClient.post<MovimientoCreado>('/movimientos', payload)
  return data
}

/**
 * GET /movimientos. El `signal` viene de React Query: cuando cambian los
 * filtros, el request anterior se aborta y no puede pisar al nuevo.
 *
 * Los filtros en `undefined` axios no los manda, y sin ellos el backend no
 * filtra. El orden lo define el backend (más recientes primero) y acá no se
 * toca.
 */
export async function listarMovimientos(
  filtros: MovimientosQuery,
  signal?: AbortSignal
): Promise<PaginatedResponse<Movimiento>> {
  const { data } = await httpClient.get<PaginatedResponse<Movimiento>>('/movimientos', {
    params: {
      FK_Deposito: filtros.FK_Deposito,
      FK_TipoMovimiento: filtros.FK_TipoMovimiento,
      FK_articulo: filtros.FK_articulo,
      fechaDesde: filtros.fechaDesde,
      fechaHasta: filtros.fechaHasta,
      page: filtros.page,
      limit: filtros.limit,
    },
    signal,
  })

  return data
}

/** GET /movimientos/:id — la cabecera con todas sus líneas, para el modal de detalle. */
export async function obtenerMovimiento(
  id: number,
  signal?: AbortSignal
): Promise<MovimientoDetalle> {
  const { data } = await httpClient.get<MovimientoDetalle>(`/movimientos/${id}`, { signal })
  return data
}
