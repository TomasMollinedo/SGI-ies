import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import {
  CUENTAS_CORRIENTES_QUERY_KEYS,
  listarCuentasCorrientes,
  obtenerCardexCuentaCorriente,
} from '../services/cuentasCorrientes.service'
import type {
  CardexCuentaCorrienteResponse,
  FiltrosCardexCuentaCorriente,
} from '../types/cardexCuentaCorriente.types'
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

/**
 * Extracto de cuenta corriente de un proveedor. `enabled` en `null` porque la
 * página lo pide con el id que viene de la URL, que puede no ser un número
 * válido. Mismo `keepPreviousData` que el listado: al cambiar de período, la
 * tabla anterior queda en pantalla en vez de parpadear.
 */
export function useCardexCuentaCorriente(id: number | null, filtros: FiltrosCardexCuentaCorriente) {
  return useQuery<CardexCuentaCorrienteResponse, ApiErrorResponse>({
    queryKey: CUENTAS_CORRIENTES_QUERY_KEYS.CARDEX(id ?? -1, filtros),
    queryFn: ({ signal }) => obtenerCardexCuentaCorriente(id as number, filtros, signal),
    enabled: id !== null,
    placeholderData: keepPreviousData,
  })
}
