import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type {
  CrearDepositoPayload,
  DepositoAuditado,
  DepositoDetalle,
  EditarDepositoPayload,
  Deposito,
  FiltrosDepositos,
} from '../types/deposito.types'

export const DEPOSITOS_QUERY_KEYS = {
  LISTA: (filtros: FiltrosDepositos) => ['depositos', 'lista', filtros] as const,
  DETALLE: (id: number) => ['depositos', 'detalle', id] as const,
}

export async function listarDepositos(
  filtros: FiltrosDepositos
): Promise<PaginatedResponse<Deposito>> {
  const { data } = await httpClient.get<PaginatedResponse<Deposito>>('/depositos', {
    params: {
      nombre: filtros.nombre || undefined,
      estado: filtros.estado,
      es_obrador: filtros.esObrador,
      page: filtros.page,
      limit: filtros.limit,
    },
  })
  return data
}

export async function obtenerDeposito(id: number): Promise<DepositoDetalle> {
  const { data } = await httpClient.get<DepositoDetalle>(`/depositos/${id}`)
  return data
}

export async function crearDeposito(payload: CrearDepositoPayload): Promise<DepositoAuditado> {
  const { data } = await httpClient.post<DepositoAuditado>('/depositos', payload)
  return data
}

export async function editarDeposito(
  id: number,
  payload: EditarDepositoPayload
): Promise<DepositoAuditado> {
  const { data } = await httpClient.patch<DepositoAuditado>(`/depositos/${id}`, payload)
  return data
}

export async function darDeBajaDeposito(id: number): Promise<DepositoAuditado> {
  const { data } = await httpClient.patch<DepositoAuditado>(`/depositos/${id}/baja`)
  return data
}

export async function reactivarDeposito(id: number): Promise<DepositoAuditado> {
  const { data } = await httpClient.patch<DepositoAuditado>(`/depositos/${id}/alta`)
  return data
}
