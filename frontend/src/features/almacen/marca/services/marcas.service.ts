import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type {
  CrearMarcaPayload,
  EditarMarcaPayload,
  Marca,
  MarcaAuditada,
  MarcaDetalle,
  MarcasQuery,
} from '../types/marca.types'

export const MARCAS_QUERY_KEYS = {
  LISTA: (filtros: MarcasQuery) => ['marcas', 'lista', filtros] as const,
  DETALLE: (id: number | null) => ['marcas', 'detalle', id] as const,
}

/**
 * GET /marcas. El `signal` viene de React Query: cuando cambian los filtros,
 * el request anterior se aborta y no puede pisar al nuevo.
 *
 * `estado` viaja como `'true'`/`'false'` porque el backend lo valida como enum
 * de strings, no como booleano.
 */
export async function listarMarcas(
  filtros: MarcasQuery,
  signal?: AbortSignal
): Promise<PaginatedResponse<Marca>> {
  const { data } = await httpClient.get<PaginatedResponse<Marca>>('/marcas', {
    params: {
      nombre: filtros.nombre,
      estado: filtros.estado === undefined ? undefined : String(filtros.estado),
      page: filtros.page,
      limit: filtros.limit,
    },
    signal,
  })

  return data
}

/** GET /marcas/:id — la marca con su trazabilidad, para el modal de detalle. */
export async function obtenerMarca(id: number, signal?: AbortSignal): Promise<MarcaDetalle> {
  const { data } = await httpClient.get<MarcaDetalle>(`/marcas/${id}`, { signal })
  return data
}

export async function crearMarca(payload: CrearMarcaPayload): Promise<MarcaAuditada> {
  const { data } = await httpClient.post<MarcaAuditada>('/marcas', payload)
  return data
}

export async function editarMarca(id: number, payload: EditarMarcaPayload): Promise<MarcaAuditada> {
  const { data } = await httpClient.patch<MarcaAuditada>(`/marcas/${id}`, payload)
  return data
}

// TODO: dar de baja (PATCH /marcas/:id/baja) y reactivar (PATCH /marcas/:id/alta)
// cuando se implemente la HU correspondiente.
