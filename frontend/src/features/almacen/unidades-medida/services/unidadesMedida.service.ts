import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type {
  CrearUnidadMedidaPayload,
  EditarUnidadMedidaPayload,
  FiltrosUnidadesMedida,
  UnidadMedida,
  UnidadMedidaAuditada,
  UnidadMedidaDetalle,
} from '../types/unidadMedida.types'

export const UNIDADES_MEDIDA_QUERY_KEYS = {
  LISTA: (filtros: FiltrosUnidadesMedida) => ['unidades-medida', 'lista', filtros] as const,
  DETALLE: (id: number) => ['unidades-medida', 'detalle', id] as const,
}

export async function listarUnidadesMedida(
  filtros: FiltrosUnidadesMedida
): Promise<PaginatedResponse<UnidadMedida>> {
  const { data } = await httpClient.get<PaginatedResponse<UnidadMedida>>('/unidades-medida', {
    params: {
      nombre: filtros.nombre || undefined,
      estado: filtros.estado,
      page: filtros.page,
      limit: filtros.limit,
    },
  })
  return data
}

export async function obtenerUnidadMedida(id: number): Promise<UnidadMedidaDetalle> {
  const { data } = await httpClient.get<UnidadMedidaDetalle>(`/unidades-medida/${id}`)
  return data
}

export async function crearUnidadMedida(
  payload: CrearUnidadMedidaPayload
): Promise<UnidadMedidaAuditada> {
  const { data } = await httpClient.post<UnidadMedidaAuditada>('/unidades-medida', payload)
  return data
}

export async function editarUnidadMedida(
  id: number,
  payload: EditarUnidadMedidaPayload
): Promise<UnidadMedidaAuditada> {
  const { data } = await httpClient.patch<UnidadMedidaAuditada>(`/unidades-medida/${id}`, payload)
  return data
}

export async function darDeBajaUnidadMedida(id: number): Promise<UnidadMedidaAuditada> {
  const { data } = await httpClient.patch<UnidadMedidaAuditada>(`/unidades-medida/${id}/baja`)
  return data
}

export async function reactivarUnidadMedida(id: number): Promise<UnidadMedidaAuditada> {
  const { data } = await httpClient.patch<UnidadMedidaAuditada>(`/unidades-medida/${id}/alta`)
  return data
}
