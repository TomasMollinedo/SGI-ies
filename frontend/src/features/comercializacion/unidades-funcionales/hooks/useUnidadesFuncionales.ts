import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PROYECTOS_QUERY_KEYS } from '@/features/proyectos/services/proyectos.service'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import { subirImagen } from '../services/almacenamiento.service'
import {
  UNIDADES_FUNCIONALES_QUERY_KEYS,
  agregarImagenUnidadFuncional,
  crearUnidadFuncional,
  darDeBajaUnidadFuncional,
  editarUnidadFuncional,
  listarTipologias,
  listarUnidadesFuncionales,
  obtenerUnidadFuncional,
  ordenarImagenesUnidadFuncional,
  quitarImagenUnidadFuncional,
  reactivarUnidadFuncional,
} from '../services/unidadesFuncionales.service'
import type {
  CrearUnidadFuncionalPayload,
  EditarUnidadFuncionalPayload,
  TipologiaCatalogoItem,
  UnidadFuncionalDetalle,
  UnidadFuncionalListItem,
  UnidadesFuncionalesQuery,
} from '../types/unidadFuncional.types'

/** Listado paginado, con los filtros combinados que soporta el backend (proyecto, tipología, superficie, estado). */
export function useUnidadesFuncionales(filtros: UnidadesFuncionalesQuery) {
  return useQuery<PaginatedResponse<UnidadFuncionalListItem>, ApiErrorResponse>({
    queryKey: UNIDADES_FUNCIONALES_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarUnidadesFuncionales(filtros, signal),
    placeholderData: keepPreviousData,
  })
}

/** Detalle de una unidad. Con `id` en `null` la query queda deshabilitada (ej. en modo alta, antes de crearla). */
export function useUnidadFuncionalDetalle(id: number | null) {
  return useQuery<UnidadFuncionalDetalle, ApiErrorResponse>({
    queryKey: UNIDADES_FUNCIONALES_QUERY_KEYS.DETALLE(id),
    queryFn: ({ signal }) => obtenerUnidadFuncional(id!, signal),
    enabled: id !== null,
  })
}

/** Catálogo de tipologías, para el `<select>` del formulario y del filtro del listado. */
export function useTipologias() {
  return useQuery<TipologiaCatalogoItem[], ApiErrorResponse>({
    queryKey: UNIDADES_FUNCIONALES_QUERY_KEYS.TIPOLOGIAS,
    queryFn: ({ signal }) => listarTipologias(signal),
  })
}

/**
 * El alta, la baja y la reactivación cambian el presupuesto y el contador de
 * unidades cargadas del proyecto: además del listado, invalidan el detalle de
 * ESE proyecto puntual (`GET /proyectos/:id`), que es lo que alimenta los
 * `StatTile` de presupuesto / cargadas-planificadas.
 */
function invalidarListadoYProyecto(
  queryClient: ReturnType<typeof useQueryClient>,
  idProyecto: number
) {
  queryClient.invalidateQueries({ queryKey: ['unidades-funcionales', 'lista'] })
  queryClient.invalidateQueries({ queryKey: PROYECTOS_QUERY_KEYS.DETALLE(idProyecto) })
}

export function useCrearUnidadFuncional() {
  const queryClient = useQueryClient()

  return useMutation<UnidadFuncionalDetalle, ApiErrorResponse, CrearUnidadFuncionalPayload>({
    mutationFn: crearUnidadFuncional,
    onSuccess: (unidad) => invalidarListadoYProyecto(queryClient, unidad.FK_proyecto),
  })
}

export function useEditarUnidadFuncional() {
  const queryClient = useQueryClient()

  return useMutation<
    UnidadFuncionalDetalle,
    ApiErrorResponse,
    { id: number; payload: EditarUnidadFuncionalPayload }
  >({
    mutationFn: ({ id, payload }) => editarUnidadFuncional(id, payload),
    onSuccess: (unidad) => {
      queryClient.invalidateQueries({ queryKey: ['unidades-funcionales', 'lista'] })
      queryClient.invalidateQueries({
        queryKey: UNIDADES_FUNCIONALES_QUERY_KEYS.DETALLE(unidad.id_unidad_funcional),
      })
      // El costo pudo haber cambiado (mientras siga editable): refresca el presupuesto igual.
      queryClient.invalidateQueries({ queryKey: PROYECTOS_QUERY_KEYS.DETALLE(unidad.FK_proyecto) })
    },
  })
}

export function useDarDeBajaUnidadFuncional() {
  const queryClient = useQueryClient()

  return useMutation<UnidadFuncionalDetalle, ApiErrorResponse, number>({
    mutationFn: darDeBajaUnidadFuncional,
    onSuccess: (unidad) => {
      invalidarListadoYProyecto(queryClient, unidad.FK_proyecto)
      queryClient.invalidateQueries({
        queryKey: UNIDADES_FUNCIONALES_QUERY_KEYS.DETALLE(unidad.id_unidad_funcional),
      })
    },
  })
}

export function useReactivarUnidadFuncional() {
  const queryClient = useQueryClient()

  return useMutation<UnidadFuncionalDetalle, ApiErrorResponse, number>({
    mutationFn: reactivarUnidadFuncional,
    onSuccess: (unidad) => {
      invalidarListadoYProyecto(queryClient, unidad.FK_proyecto)
      queryClient.invalidateQueries({
        queryKey: UNIDADES_FUNCIONALES_QUERY_KEYS.DETALLE(unidad.id_unidad_funcional),
      })
    },
  })
}

/** Sube el archivo al almacenamiento de objetos (T97). Todavía no lo asocia a ninguna galería. */
export function useSubirImagen() {
  return useMutation<{ url: string }, ApiErrorResponse, File>({
    mutationFn: subirImagen,
  })
}

function invalidarDetalleUnidad(queryClient: ReturnType<typeof useQueryClient>, id: number) {
  queryClient.invalidateQueries({ queryKey: UNIDADES_FUNCIONALES_QUERY_KEYS.DETALLE(id) })
}

export function useAgregarImagenUnidadFuncional() {
  const queryClient = useQueryClient()

  return useMutation<
    UnidadFuncionalDetalle,
    ApiErrorResponse,
    { id: number; url: string; orden?: number }
  >({
    mutationFn: ({ id, url, orden }) => agregarImagenUnidadFuncional(id, { url, orden }),
    onSuccess: (_unidad, variables) => invalidarDetalleUnidad(queryClient, variables.id),
  })
}

export function useOrdenarImagenesUnidadFuncional() {
  const queryClient = useQueryClient()

  return useMutation<
    UnidadFuncionalDetalle,
    ApiErrorResponse,
    { id: number; idsImagenUnidad: number[] }
  >({
    mutationFn: ({ id, idsImagenUnidad }) => ordenarImagenesUnidadFuncional(id, idsImagenUnidad),
    onSuccess: (_unidad, variables) => invalidarDetalleUnidad(queryClient, variables.id),
  })
}

export function useQuitarImagenUnidadFuncional() {
  const queryClient = useQueryClient()

  return useMutation<UnidadFuncionalDetalle, ApiErrorResponse, { id: number; idImagen: number }>({
    mutationFn: ({ id, idImagen }) => quitarImagenUnidadFuncional(id, idImagen),
    onSuccess: (_unidad, variables) => invalidarDetalleUnidad(queryClient, variables.id),
  })
}