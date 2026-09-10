import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import {
  CUENTAS_CORRIENTES_QUERY_KEYS,
  listarCuentasCorrientes,
} from '../services/cuentasCorrientes.service'
import type {
  CuentasCorrientesQuery,
  CuentasCorrientesResponse,
} from '../types/cuentaCorriente.types'

/**
 * Listado paginado de cuentas corrientes. Cada combinación de filtros es su
 * propia entrada de cache, así que una respuesta vieja nunca puede pisar a la
 * actual.
 *
 * `keepPreviousData` mantiene el paginador y la card en pantalla mientras
 * llega la página siguiente: sin eso, `meta`/`resumen` desaparecerían y la
 * pantalla saltaría.
 */
export function useCuentasCorrientes(filtros: CuentasCorrientesQuery) {
  return useQuery<CuentasCorrientesResponse, ApiErrorResponse>({
    queryKey: CUENTAS_CORRIENTES_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarCuentasCorrientes(filtros, signal),
    placeholderData: keepPreviousData,
  })
}
