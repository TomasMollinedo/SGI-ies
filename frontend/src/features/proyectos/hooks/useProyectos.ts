import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  PROYECTOS_QUERY_KEYS,
  agregarImagenProyecto,
  cambiarEstadoObraProyecto,
  crearProyecto,
  darDeBajaProyecto,
  editarProyecto,
  listarLocalidadesProyecto,
  listarProyectos,
  obtenerFichaProyecto,
  obtenerProyecto,
  ordenarImagenesProyecto,
  quitarImagenProyecto,
} from '../services/proyectos.service'
import type {
  EditarProyectoPayload,
  CrearProyectoPayload,
  EstadoObraDestino,
  LocalidadCatalogoItem,
  ProyectoDetalle,
  ProyectoFicha,
  ProyectoResumen,
  ProyectosQuery,
  TipoImagenProyecto,
} from '../types/proyecto.types'

/**
 * Listado paginado de proyectos, pensado para alimentar combos con búsqueda.
 * Con `retry: false` un endpoint inexistente falla una sola vez y el combo se
 * queda sin opciones en vez de reintentar en loop.
 *
 * `refrescarAlMontar` es para el listado de proyectos: su % vendido cambia
 * desde Publicaciones, Ventas y Cobranzas, que no invalidan proyectos, así que
 * no se sirve de caché. Los combos no lo pasan y siguen como siempre.
 */
export function useProyectos(
  filtros: ProyectosQuery,
  opciones?: { enabled?: boolean; refrescarAlMontar?: boolean }
) {
  return useQuery<PaginatedResponse<ProyectoResumen>, ApiErrorResponse>({
    queryKey: PROYECTOS_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarProyectos(filtros, signal),
    placeholderData: keepPreviousData,
    enabled: opciones?.enabled ?? true,
    retry: false,
    ...(opciones?.refrescarAlMontar ? { staleTime: 0, refetchOnMount: 'always' as const } : {}),
  })
}

/**
 * Detalle de un proyecto: presupuesto y unidades cargadas/planificadas
 * incluidos (T102). Con `id` en `null` la query queda deshabilitada.
 */
export function useProyectoDetalle(id: number | null) {
  return useQuery<ProyectoDetalle, ApiErrorResponse>({
    queryKey: PROYECTOS_QUERY_KEYS.DETALLE(id),
    queryFn: ({ signal }) => obtenerProyecto(id!, signal),
    enabled: id !== null,
    retry: false,
  })
}

/**
 * Ficha de un proyecto: precio estimado, situación comercial y unidades
 * activas. Es una query aparte del detalle, para que la página no la espere.
 */
export function useProyectoFicha(id: number | null) {
  return useQuery<ProyectoFicha, ApiErrorResponse>({
    queryKey: PROYECTOS_QUERY_KEYS.FICHA(id),
    queryFn: ({ signal }) => obtenerFichaProyecto(id!, signal),
    enabled: id !== null,
    retry: false,
    // La situación comercial cambia desde Publicaciones, Ventas y Cobranzas,
    // que no invalidan proyectos: no se sirve de caché (mismo criterio que
    // `useUnidadFuncionalDetalle`).
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

/** Localidades de los proyectos activos, para el filtro del listado. */
export function useLocalidadesProyecto() {
  return useQuery<LocalidadCatalogoItem[], ApiErrorResponse>({
    queryKey: PROYECTOS_QUERY_KEYS.LOCALIDADES,
    queryFn: ({ signal }) => listarLocalidadesProyecto(signal),
    retry: false,
  })
}

/**
 * Todo lo de proyectos: el listado, los combos de proyecto de Comercialización
 * y de Unidades (misma key de lista), el detalle y las localidades del filtro.
 */
const PROYECTOS_KEY = ['proyectos'] as const

/**
 * Lo que muestra datos del proyecto sin pedirlos a /proyectos: las unidades
 * funcionales (nombre, código y condición de entrega, que sale del estado de
 * obra y de la fecha de fin estimada), las publicaciones (fecha de entrega de
 * referencia, y qué unidades se pueden publicar según el estado de obra) y el
 * catálogo público (nombre, portada y fecha de entrega).
 */
function invalidarDatosDerivadosDelProyecto(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['unidades-funcionales'] })
  queryClient.invalidateQueries({ queryKey: ['publicaciones'] })
  queryClient.invalidateQueries({ queryKey: ['catalogo-publico'] })
}

/** Las mutaciones no muestran toasts ni navegan: eso lo decide quien las use. */

export function useCrearProyecto() {
  const queryClient = useQueryClient()

  return useMutation<ProyectoDetalle, ApiErrorResponse, CrearProyectoPayload>({
    mutationFn: crearProyecto,
    // Un proyecto nuevo no tiene unidades ni publicaciones: alcanza con lo de proyectos.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROYECTOS_KEY })
    },
  })
}

export function useEditarProyecto() {
  const queryClient = useQueryClient()

  return useMutation<
    ProyectoDetalle,
    ApiErrorResponse,
    { id: number; payload: EditarProyectoPayload }
  >({
    mutationFn: ({ id, payload }) => editarProyecto(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROYECTOS_KEY })
      invalidarDatosDerivadosDelProyecto(queryClient)
    },
  })
}

export function useCambiarEstadoObraProyecto() {
  const queryClient = useQueryClient()

  return useMutation<
    ProyectoDetalle,
    ApiErrorResponse,
    { id: number; estadoObra: EstadoObraDestino }
  >({
    mutationFn: ({ id, estadoObra }) => cambiarEstadoObraProyecto(id, estadoObra),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROYECTOS_KEY })
      invalidarDatosDerivadosDelProyecto(queryClient)
    },
  })
}

export function useDarDeBajaProyecto() {
  const queryClient = useQueryClient()

  return useMutation<ProyectoDetalle, ApiErrorResponse, number>({
    mutationFn: darDeBajaProyecto,
    // La baja exige que no haya unidades activas, así que tampoco hay
    // publicaciones ni catálogo que refrescar.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROYECTOS_KEY })
    },
  })
}

/** Las imágenes de diseño solo se ven en el detalle del proyecto: es lo único que se invalida. */
function invalidarDetalleProyecto(queryClient: QueryClient, id: number) {
  queryClient.invalidateQueries({ queryKey: PROYECTOS_QUERY_KEYS.DETALLE(id) })
}

export function useAgregarImagenProyecto() {
  const queryClient = useQueryClient()

  return useMutation<
    ProyectoDetalle,
    ApiErrorResponse,
    { id: number; url: string; tipo: TipoImagenProyecto }
  >({
    // Sin `orden`: el backend la pone al final de la galería.
    mutationFn: ({ id, url, tipo }) => agregarImagenProyecto(id, { url, tipo }),
    onSuccess: (_proyecto, variables) => invalidarDetalleProyecto(queryClient, variables.id),
  })
}

export function useOrdenarImagenesProyecto() {
  const queryClient = useQueryClient()

  return useMutation<
    ProyectoDetalle,
    ApiErrorResponse,
    { id: number; idsImagenProyecto: number[] }
  >({
    mutationFn: ({ id, idsImagenProyecto }) => ordenarImagenesProyecto(id, idsImagenProyecto),
    onSuccess: (_proyecto, variables) => invalidarDetalleProyecto(queryClient, variables.id),
  })
}

export function useQuitarImagenProyecto() {
  const queryClient = useQueryClient()

  return useMutation<ProyectoDetalle, ApiErrorResponse, { id: number; idImagen: number }>({
    mutationFn: ({ id, idImagen }) => quitarImagenProyecto(id, idImagen),
    onSuccess: (_proyecto, variables) => invalidarDetalleProyecto(queryClient, variables.id),
  })
}
