import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type {
  CrearFormaPagoPayload,
  EditarFormaPagoPayload,
  FormaPago,
  FormaPagoAuditada,
  FormaPagoDetalle,
  FormasPagoQuery,
} from '../types/formaPago.types'

export const FORMAS_PAGO_QUERY_KEYS = {
  LISTA: (filtros: FormasPagoQuery) => ['formas-pago', 'lista', filtros] as const,
  DETALLE: (id: number | null) => ['formas-pago', 'detalle', id] as const,
}

/**
 * GET /formas-pago. El `signal` viene de React Query: cuando cambian los
 * filtros, el request anterior se aborta y no puede pisar al nuevo.
 *
 * `estado` viaja como `'true'`/`'false'`/`'todos'` porque el backend lo valida
 * como enum de strings. Ojo con el default: a diferencia del resto de los ABM,
 * omitir el parámetro **no** trae todas — trae solo las activas. Para ver las
 * activas y las dadas de baja juntas hay que mandar `'todos'`.
 */
export async function listarFormasPago(
  filtros: FormasPagoQuery,
  signal?: AbortSignal
): Promise<PaginatedResponse<FormaPago>> {
  const { data } = await httpClient.get<PaginatedResponse<FormaPago>>('/formas-pago', {
    params: {
      nombre: filtros.nombre,
      estado: filtros.estado,
      page: filtros.page,
      limit: filtros.limit,
    },
    signal,
  })

  return data
}

/**
 * GET /formas-pago/:id — la forma de pago con su trazabilidad, para el modal de
 * detalle. El id es el `id_forma_pago`, no el código formateado.
 */
export async function obtenerFormaPago(
  id: number,
  signal?: AbortSignal
): Promise<FormaPagoDetalle> {
  const { data } = await httpClient.get<FormaPagoDetalle>(`/formas-pago/${id}`, { signal })

  return data
}

/**
 * POST /formas-pago — el alta es el único lugar donde se define si la forma de
 * pago requiere número de referencia.
 */
export async function crearFormaPago(payload: CrearFormaPagoPayload): Promise<FormaPagoAuditada> {
  const { data } = await httpClient.post<FormaPagoAuditada>('/formas-pago', payload)
  return data
}

/** PATCH /formas-pago/:id — solo nombre y descripción; el indicador no viaja nunca. */
export async function editarFormaPago(
  id: number,
  payload: EditarFormaPagoPayload
): Promise<FormaPagoAuditada> {
  const { data } = await httpClient.patch<FormaPagoAuditada>(`/formas-pago/${id}`, payload)
  return data
}

/** PATCH /formas-pago/:id/baja — baja lógica. Sin body; devuelve la forma ya actualizada. */
export async function darDeBajaFormaPago(id: number): Promise<FormaPagoAuditada> {
  const { data } = await httpClient.patch<FormaPagoAuditada>(`/formas-pago/${id}/baja`)
  return data
}

/** PATCH /formas-pago/:id/alta — alta lógica. Sin body; devuelve la forma ya actualizada. */
export async function reactivarFormaPago(id: number): Promise<FormaPagoAuditada> {
  const { data } = await httpClient.patch<FormaPagoAuditada>(`/formas-pago/${id}/alta`)
  return data
}
