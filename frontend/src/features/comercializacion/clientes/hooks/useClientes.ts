import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  CLIENTES_QUERY_KEYS,
  editarCliente,
  listarClientes,
  obtenerClienteFicha,
} from '../services/clientes.service'
import type {
  ClienteFicha,
  ClienteListItem,
  ClientesQuery,
  EditarClientePayload,
} from '../types/cliente.types'

/**
 * Listado paginado de clientes (HU-33). Cada combinación de filtros es su
 * propia entrada de cache, así que una respuesta vieja nunca puede pisar a la
 * actual.
 *
 * `keepPreviousData` mantiene el paginador en pantalla mientras llega la
 * página siguiente: sin eso, `meta` desaparecería y el pie de la tabla saltaría.
 */
export function useClientes(filtros: ClientesQuery) {
  return useQuery<PaginatedResponse<ClienteListItem>, ApiErrorResponse>({
    queryKey: CLIENTES_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarClientes(filtros, signal),
    placeholderData: keepPreviousData,
  })
}

/**
 * Ficha de un cliente. Con `id` en `null` (o un id de ruta que no es un
 * número) la query queda deshabilitada y, como el id es parte de la key,
 * tampoco arrastra la ficha del cliente anterior.
 */
export function useClienteFicha(id: number | null) {
  return useQuery<ClienteFicha, ApiErrorResponse>({
    queryKey: CLIENTES_QUERY_KEYS.DETALLE(id),
    // El `!` es seguro: con `id` en `null` la query no corre (`enabled`).
    queryFn: ({ signal }) => obtenerClienteFicha(id!, signal),
    enabled: id !== null,
  })
}

/**
 * Edición de los datos de contacto. No muestra toast — eso lo decide quien la
 * use (`ClienteForm`).
 *
 * El PATCH devuelve la ficha completa, así que se guarda directo en la cache
 * con `setQueryData` en vez de invalidarla y pedirla de nuevo. El listado sí
 * se invalida: nombre, DNI/CUIL, correo y teléfono también se muestran ahí.
 */
export function useEditarCliente() {
  const queryClient = useQueryClient()

  return useMutation<ClienteFicha, ApiErrorResponse, { id: number; payload: EditarClientePayload }>(
    {
      mutationFn: ({ id, payload }) => editarCliente(id, payload),
      onSuccess: (ficha, variables) => {
        queryClient.setQueryData(CLIENTES_QUERY_KEYS.DETALLE(variables.id), ficha)
        queryClient.invalidateQueries({ queryKey: ['clientes', 'lista'] })
      },
    }
  )
}
