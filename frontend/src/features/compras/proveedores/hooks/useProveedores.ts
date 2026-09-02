import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  PROVEEDORES_QUERY_KEYS,
  listarCondicionesIva,
  listarProveedores,
} from '../services/proveedores.service'
import type { CondicionIva, Proveedor, ProveedoresQuery } from '../types/proveedor.types'

/**
 * Listado paginado de proveedores. Cada combinación de filtros es su propia
 * entrada de cache, así que una respuesta vieja nunca puede pisar a la actual.
 *
 * `keepPreviousData` mantiene el paginador en pantalla mientras llega la
 * página siguiente: sin eso, `meta` desaparecería y el pie de la tabla saltaría.
 */
export function useProveedores(filtros: ProveedoresQuery) {
  return useQuery<PaginatedResponse<Proveedor>, ApiErrorResponse>({
    queryKey: PROVEEDORES_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarProveedores(filtros, signal),
    placeholderData: keepPreviousData,
  })
}

/** Catálogo de condiciones frente al IVA, para el filtro. Es de referencia: no cambia seguido. */
export function useCondicionesIva() {
  return useQuery<CondicionIva[], ApiErrorResponse>({
    queryKey: PROVEEDORES_QUERY_KEYS.CONDICIONES_IVA,
    queryFn: ({ signal }) => listarCondicionesIva(signal),
  })
}
