import { httpClient } from '@/shared/api/httpClient'
import type {
  AnularCobroPayload,
  CobroDetalle,
  CrearCobroPayload,
  CuotasImputablesResponse,
} from '../types/cobro.types'

/**
 * `LISTAS` es el prefijo de todas las páginas/filtros del listado de cobros:
 * las mutaciones de T114 lo invalidan entero. El listado en sí
 * (`LISTA(filtros)` + `listarCobros`) lo agrega T115 colgando de este mismo
 * prefijo, así esas invalidaciones lo alcanzan sin tocar nada acá.
 */
export const COBROS_QUERY_KEYS = {
  RAIZ: ['cobros'] as const,
  LISTAS: ['cobros', 'lista'] as const,
  CUOTAS_IMPUTABLES: (FK_cliente: number) => ['cobros', 'cuotas-imputables', FK_cliente] as const,
  DETALLE: (id: number | null) => ['cobros', 'detalle', id] as const,
  // Mismo endpoint que el buscador de Ventas (GET /ventas/buscar-clientes),
  // pero paginado por página: key propia para no mezclarse con la de Ventas.
  BUSQUEDA_CLIENTES: (busqueda: string, page: number) =>
    ['cobros', 'buscar-clientes', busqueda, page] as const,
}

/**
 * GET /cobros/cuotas-imputables: las cuotas con saldo pendiente > 0 del
 * cliente (sin anular, de ventas no canceladas), para armar el detalle del
 * formulario de cobro. Sin paginar.
 */
export async function listarCuotasImputables(
  FK_cliente: number,
  signal?: AbortSignal
): Promise<CuotasImputablesResponse> {
  const { data } = await httpClient.get<CuotasImputablesResponse>('/cobros/cuotas-imputables', {
    params: { FK_cliente },
    signal,
  })

  return data
}

/** POST /cobros: confirma un cobro imputado a una o más cuotas. Nace siempre CONFIRMADO. */
export async function crearCobro(payload: CrearCobroPayload): Promise<CobroDetalle> {
  const { data } = await httpClient.post<CobroDetalle>('/cobros', payload)

  return data
}

/** GET /cobros/:id: cabecera completa + el detalle de imputaciones (alimenta el recibo). */
export async function obtenerCobro(id: number, signal?: AbortSignal): Promise<CobroDetalle> {
  const { data } = await httpClient.get<CobroDetalle>(`/cobros/${id}`, { signal })

  return data
}

/** PATCH /cobros/:id/anular: restituye a cada cuota el saldo que este cobro había descontado. */
export async function anularCobro(id: number, payload: AnularCobroPayload): Promise<CobroDetalle> {
  const { data } = await httpClient.patch<CobroDetalle>(`/cobros/${id}/anular`, payload)

  return data
}
