import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type {
  ConsultaInterna,
  ConsultasQuery,
  ResponderConsultaPayload,
} from '../types/consulta.types'

export const CONSULTAS_QUERY_KEYS = {
  LISTA: (filtros: ConsultasQuery) => ['consultas', 'lista', filtros] as const,
}

/**
 * GET /consultas — cola interna de Comercialización (ADMINISTRADOR), filtros
 * combinables por unidad, cliente, estado y período. El orden lo fija el
 * backend (ver README de esta entrega sobre el orden actual vs. el pedido).
 */
export async function listarConsultas(
  filtros: ConsultasQuery,
  signal?: AbortSignal
): Promise<PaginatedResponse<ConsultaInterna>> {
  const { data } = await httpClient.get<PaginatedResponse<ConsultaInterna>>('/consultas', {
    params: {
      FK_unidad_funcional: filtros.FK_unidad_funcional,
      FK_cliente: filtros.FK_cliente,
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

/** PATCH /consultas/:id/responder — pasa la consulta a Respondida. No hay endpoint que la edite después. */
export async function responderConsulta(
  id: number,
  payload: ResponderConsultaPayload
): Promise<ConsultaInterna> {
  const { data } = await httpClient.patch<ConsultaInterna>(`/consultas/${id}/responder`, payload)
  return data
}
