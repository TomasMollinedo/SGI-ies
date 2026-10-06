import { httpClientCliente } from '@/shared/api/httpClientCliente'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type { Consulta, CrearConsultaPayload, MisConsultasQuery } from '../types/consulta.types'

export const CONSULTAS_CLIENTE_QUERY_KEYS = {
  MIS_CONSULTAS: (filtros: MisConsultasQuery) =>
    ['consultas-cliente', 'mis-consultas', filtros] as const,
}

/**
 * POST /cliente/consultas — requiere sesión de cliente (`httpClientCliente`,
 * no `httpClient`: es el token de CLIENTE, no el de USUARIO). Nace en estado
 * Pendiente. Sin restricción de unicidad: se puede llamar varias veces sobre
 * la misma unidad.
 */
export async function enviarConsulta(payload: CrearConsultaPayload): Promise<Consulta> {
  const { data } = await httpClientCliente.post<Consulta>('/cliente/consultas', payload)
  return data
}

/**
 * GET /cliente/consultas/mis-consultas — historial del cliente autenticado,
 * paginado, más reciente primero (lo ordena el backend).
 */
export async function listarMisConsultas(
  filtros: MisConsultasQuery,
  signal?: AbortSignal
): Promise<PaginatedResponse<Consulta>> {
  const { data } = await httpClientCliente.get<PaginatedResponse<Consulta>>(
    '/cliente/consultas/mis-consultas',
    { params: { page: filtros.page, limit: filtros.limit }, signal }
  )

  return data
}
