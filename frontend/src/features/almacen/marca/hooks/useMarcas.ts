import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  MARCAS_QUERY_KEYS,
  crearMarca,
  editarMarca,
  listarMarcas,
  obtenerMarca,
} from '../services/marcas.service'
import type {
  CrearMarcaPayload,
  EditarMarcaPayload,
  Marca,
  MarcaAuditada,
  MarcaDetalle,
  MarcasQuery,
} from '../types/marca.types'

/**
 * Listado paginado de marcas. Cada combinación de filtros es su propia entrada
 * de cache, así que una respuesta vieja nunca puede pisar a la actual.
 *
 * `keepPreviousData` mantiene el paginador en pantalla mientras llega la página
 * siguiente: sin eso, `meta` desaparecería y el pie de la tabla saltaría.
 */
export function useMarcas(filtros: MarcasQuery) {
  return useQuery<PaginatedResponse<Marca>, ApiErrorResponse>({
    queryKey: MARCAS_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarMarcas(filtros, signal),
    placeholderData: keepPreviousData,
  })
}

/**
 * Detalle de una marca. Con `id` en `null` (modal cerrado) la query queda
 * deshabilitada y, como el id es parte de la key, tampoco arrastra el estado
 * de la marca anterior.
 */
export function useMarcaDetalle(id: number | null) {
  return useQuery<MarcaDetalle, ApiErrorResponse>({
    queryKey: MARCAS_QUERY_KEYS.DETALLE(id),
    // El `!` es seguro: con `id` en `null` la query no corre (`enabled`).
    queryFn: ({ signal }) => obtenerMarca(id!, signal),
    enabled: id !== null,
  })
}

/** Las mutaciones invalidan el listado; no muestran toasts — eso lo decide quien las use. */

export function useCrearMarca() {
  const queryClient = useQueryClient()

  return useMutation<MarcaAuditada, ApiErrorResponse, CrearMarcaPayload>({
    mutationFn: crearMarca,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marcas', 'lista'] })
    },
  })
}

export function useEditarMarca() {
  const queryClient = useQueryClient()

  return useMutation<MarcaAuditada, ApiErrorResponse, { id: number; payload: EditarMarcaPayload }>({
    mutationFn: ({ id, payload }) => editarMarca(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marcas', 'lista'] })
      queryClient.invalidateQueries({ queryKey: MARCAS_QUERY_KEYS.DETALLE(variables.id) })
    },
  })
}

// TODO: useDarDeBajaMarca / useReactivarMarca cuando estén sus HU, siguiendo el
// patrón de useDepositos.
