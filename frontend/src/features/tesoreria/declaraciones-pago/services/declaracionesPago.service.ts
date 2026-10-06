import { httpClient } from '@/shared/api/httpClient'
import type {
  DeclaracionPago,
  DeclaracionPagoBase,
  DeclaracionesPagoListResponse,
  DeclaracionesPagoQuery,
  RechazarDeclaracionPayload,
} from '../types/declaracionPago.types'

/** `LISTAS` es el prefijo de todas las páginas/filtros de la bandeja: validar y rechazar lo invalidan entero. */
export const DECLARACIONES_PAGO_QUERY_KEYS = {
  LISTAS: ['declaraciones-pago', 'lista'] as const,
  LISTA: (filtros: DeclaracionesPagoQuery) => ['declaraciones-pago', 'lista', filtros] as const,
}

/**
 * GET /declaraciones-pago. Los filtros en `undefined` axios no los manda, y
 * sin ellos el backend no filtra. El orden (más antigua primero) lo fija el
 * backend: acá no se reordena nada.
 */
export async function listarDeclaracionesPago(
  filtros: DeclaracionesPagoQuery,
  signal?: AbortSignal
): Promise<DeclaracionesPagoListResponse> {
  const { data } = await httpClient.get<DeclaracionesPagoListResponse>('/declaraciones-pago', {
    params: {
      FK_cliente: filtros.FK_cliente,
      FK_forma_pago: filtros.FK_forma_pago,
      estado: filtros.estado,
      fechaDesde: filtros.fechaDesde,
      fechaHasta: filtros.fechaHasta,
      page: filtros.page,
      limit: filtros.limit,
    },
    signal,
  })

  return data
}

/**
 * Relee UNA declaración con su estado actual. No hay `GET /declaraciones-pago/:id`:
 * se usa el mismo listado acotado al cliente y al instante exacto en que se
 * declaró (`fechaDesde = fechaHasta = hora_creacion`), así la fila vuelve
 * sin depender de la página ni de los filtros que tenga la pantalla. Se
 * busca por id por si dos declaraciones del mismo cliente cayeran en el mismo
 * instante. `null` si ya no aparece.
 */
export async function releerDeclaracionPago(
  declaracion: Pick<DeclaracionPago, 'id_declaracion_pago' | 'FK_cliente' | 'hora_creacion'>
): Promise<DeclaracionPago | null> {
  const { data } = await listarDeclaracionesPago({
    FK_cliente: declaracion.FK_cliente,
    fechaDesde: declaracion.hora_creacion,
    fechaHasta: declaracion.hora_creacion,
    page: 1,
    limit: 100,
  })

  return data.find((item) => item.id_declaracion_pago === declaracion.id_declaracion_pago) ?? null
}

/**
 * PATCH /declaraciones-pago/:id/validar: genera un cobro de origen ECOMMERCE
 * (la respuesta trae su id en `FK_cobro`). 409 si la declaración ya no está
 * PENDIENTE, o si el saldo de la cuota ya no alcanza — en ese caso sigue
 * PENDIENTE y corresponde rechazarla.
 */
export async function validarDeclaracionPago(id: number): Promise<DeclaracionPagoBase> {
  const { data } = await httpClient.patch<DeclaracionPagoBase>(`/declaraciones-pago/${id}/validar`)
  return data
}

/** PATCH /declaraciones-pago/:id/rechazar. 409 si ya no está PENDIENTE. */
export async function rechazarDeclaracionPago(
  id: number,
  payload: RechazarDeclaracionPayload
): Promise<DeclaracionPagoBase> {
  const { data } = await httpClient.patch<DeclaracionPagoBase>(
    `/declaraciones-pago/${id}/rechazar`,
    payload
  )
  return data
}
