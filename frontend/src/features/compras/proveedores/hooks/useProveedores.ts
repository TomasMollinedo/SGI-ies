import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  PROVEEDORES_QUERY_KEYS,
  crearProveedor,
  darDeBajaProveedor,
  listarCondicionesIva,
  listarProveedores,
  obtenerProveedor,
  reactivarProveedor,
} from '../services/proveedores.service'
import type {
  CondicionIva,
  CrearProveedorPayload,
  Proveedor,
  ProveedorDetalle,
  ProveedoresQuery,
} from '../types/proveedor.types'

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

/**
 * Detalle de un proveedor. Con `id` en `null` (modal cerrado) la query queda
 * deshabilitada y, como el id es parte de la key, tampoco arrastra el estado
 * del proveedor anterior.
 */
export function useProveedorDetalle(id: number | null) {
  return useQuery<ProveedorDetalle, ApiErrorResponse>({
    queryKey: PROVEEDORES_QUERY_KEYS.DETALLE(id),
    // El `!` es seguro: con `id` en `null` la query no corre (`enabled`).
    queryFn: ({ signal }) => obtenerProveedor(id!, signal),
    enabled: id !== null,
  })
}

/** Catálogo de condiciones frente al IVA, para el filtro. Es de referencia: no cambia seguido. */
export function useCondicionesIva() {
  return useQuery<CondicionIva[], ApiErrorResponse>({
    queryKey: PROVEEDORES_QUERY_KEYS.CONDICIONES_IVA,
    queryFn: ({ signal }) => listarCondicionesIva(signal),
  })
}

/** No muestra toast — eso lo decide quien la use. */
export function useCrearProveedor() {
  const queryClient = useQueryClient()

  return useMutation<Proveedor, ApiErrorResponse, CrearProveedorPayload>({
    mutationFn: crearProveedor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores', 'lista'] })
    },
  })
}

/**
 * Baja y reactivación comparten forma: reciben el id, no llevan body y al
 * terminar invalidan el listado, que se vuelve a pedir con la página y los
 * filtros que estaban puestos, porque son parte de la query key.
 */

export function useDarDeBajaProveedor() {
  const queryClient = useQueryClient()

  return useMutation<Proveedor, ApiErrorResponse, number>({
    mutationFn: darDeBajaProveedor,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['proveedores', 'lista'] })
      queryClient.invalidateQueries({ queryKey: PROVEEDORES_QUERY_KEYS.DETALLE(id) })
    },
  })
}

export function useReactivarProveedor() {
  const queryClient = useQueryClient()

  return useMutation<Proveedor, ApiErrorResponse, number>({
    mutationFn: reactivarProveedor,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['proveedores', 'lista'] })
      queryClient.invalidateQueries({ queryKey: PROVEEDORES_QUERY_KEYS.DETALLE(id) })
    },
  })
}
