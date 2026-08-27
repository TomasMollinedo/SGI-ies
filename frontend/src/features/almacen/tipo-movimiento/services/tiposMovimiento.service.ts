import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type {
  CrearTipoMovimientoPayload,
  EditarTipoMovimientoPayload,
  TipoMovimiento,
  TipoMovimientoAuditado,
  TipoMovimientoDetalle,
  TiposMovimientoQuery,
} from '../types/tipoMovimiento.types'

export const TIPOS_MOVIMIENTO_QUERY_KEYS = {
  LISTA: (filtros: TiposMovimientoQuery) => ['tipos-movimiento', 'lista', filtros] as const,
  DETALLE: (id: number | null) => ['tipos-movimiento', 'detalle', id] as const,
}

/**
 * GET /tipos-movimiento. El `signal` viene de React Query: cuando cambian los
 * filtros, el request anterior se aborta y no puede pisar al nuevo.
 *
 * `estado` e `indicador_entrada` viajan como `'true'`/`'false'` porque el
 * backend los valida como enum de strings, no como booleanos. Los que quedan en
 * `undefined` axios no los manda: sin `indicador_entrada` el backend trae
 * entradas y salidas, pero sin `estado` trae solo los activos — por eso el
 * listado siempre manda estado.
 */
export async function listarTiposMovimiento(
  filtros: TiposMovimientoQuery,
  signal?: AbortSignal
): Promise<PaginatedResponse<TipoMovimiento>> {
  const { data } = await httpClient.get<PaginatedResponse<TipoMovimiento>>('/tipos-movimiento', {
    params: {
      nombre: filtros.nombre,
      estado: filtros.estado === undefined ? undefined : String(filtros.estado),
      indicador_entrada:
        filtros.indicadorEntrada === undefined ? undefined : String(filtros.indicadorEntrada),
      page: filtros.page,
      limit: filtros.limit,
    },
    signal,
  })

  return data
}

/**
 * GET /tipos-movimiento/:id — el tipo de movimiento con su trazabilidad, para el
 * modal de detalle. El id es el `id_tipo_movimiento`, no el código formateado.
 */
export async function obtenerTipoMovimiento(
  id: number,
  signal?: AbortSignal
): Promise<TipoMovimientoDetalle> {
  const { data } = await httpClient.get<TipoMovimientoDetalle>(`/tipos-movimiento/${id}`, {
    signal,
  })

  return data
}

/** POST /tipos-movimiento — el alta es el único lugar donde se define el indicador. */
export async function crearTipoMovimiento(
  payload: CrearTipoMovimientoPayload
): Promise<TipoMovimientoAuditado> {
  const { data } = await httpClient.post<TipoMovimientoAuditado>('/tipos-movimiento', payload)
  return data
}

/** PATCH /tipos-movimiento/:id — solo nombre y descripción; el indicador no viaja nunca. */
export async function editarTipoMovimiento(
  id: number,
  payload: EditarTipoMovimientoPayload
): Promise<TipoMovimientoAuditado> {
  const { data } = await httpClient.patch<TipoMovimientoAuditado>(
    `/tipos-movimiento/${id}`,
    payload
  )
  return data
}
