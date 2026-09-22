import { httpClientCliente } from '@/shared/api/httpClientCliente'
import type { ProyectosDestacadosResponse } from '../types/catalogoPublico.types'

export const CATALOGO_PUBLICO_QUERY_KEYS = {
  DESTACADOS: ['catalogo-publico', 'destacados'] as const,
}

/**
 * GET /catalogo/destacados (T107): los proyectos con más unidades disponibles,
 * para la landing. El endpoint es público (`@Public()`), pero va por el cliente
 * del ecommerce igual que el resto del dominio público — si hay sesión de
 * cliente el token viaja, y si no, la request sale sin Authorization.
 */
export async function obtenerProyectosDestacados(
  signal?: AbortSignal
): Promise<ProyectosDestacadosResponse> {
  const { data } = await httpClientCliente.get<ProyectosDestacadosResponse>(
    '/catalogo/destacados',
    {
      signal,
    }
  )

  return data
}
