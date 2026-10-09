import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type {
  AgregarImagenProyectoPayload,
  CrearProyectoPayload,
  EditarProyectoPayload,
  EstadoObraDestino,
  LocalidadCatalogoItem,
  ProyectoDetalle,
  ProyectoFicha,
  ProyectoResumen,
  ProyectosQuery,
} from '../types/proyecto.types'

export const PROYECTOS_QUERY_KEYS = {
  LISTA: (filtros: ProyectosQuery) => ['proyectos', 'lista', filtros] as const,
  DETALLE: (id: number | null) => ['proyectos', 'detalle', id] as const,
  // Anidada a propósito bajo DETALLE(id): todo lo que ya invalida el detalle
  // (unidades, imágenes, mutaciones del proyecto) refresca también la ficha.
  FICHA: (id: number | null) => ['proyectos', 'detalle', id, 'ficha'] as const,
  LOCALIDADES: ['proyectos', 'localidades'] as const,
}

/**
 * GET /proyectos. Único punto de contacto con el endpoint de Proyectos: lo usan
 * los combos de proyecto de Comercialización, y el módulo de Proyectos puede
 * reclamarlo cuando exista.
 */
export async function listarProyectos(
  filtros: ProyectosQuery,
  signal?: AbortSignal
): Promise<PaginatedResponse<ProyectoResumen>> {
  const { data } = await httpClient.get<PaginatedResponse<ProyectoResumen>>('/proyectos', {
    params: {
      busqueda: filtros.busqueda,
      estado_obra: filtros.estado_obra,
      estado: filtros.estado,
      localidad: filtros.localidad,
      page: filtros.page,
      limit: filtros.limit,
    },
    signal,
  })

  return data
}

/**
 * GET /proyectos/:id — el proyecto con su presupuesto y el contador de
 * unidades cargadas contra planificadas, calculados por el backend (T102).
 */
export async function obtenerProyecto(id: number, signal?: AbortSignal): Promise<ProyectoDetalle> {
  const { data } = await httpClient.get<ProyectoDetalle>(`/proyectos/${id}`, { signal })
  return data
}

/**
 * GET /proyectos/:id/ficha — precio estimado de venta, situación comercial y
 * lista de unidades activas, calculados por el backend (T124).
 */
export async function obtenerFichaProyecto(
  id: number,
  signal?: AbortSignal
): Promise<ProyectoFicha> {
  const { data } = await httpClient.get<ProyectoFicha>(`/proyectos/${id}/ficha`, { signal })
  return data
}

/**
 * GET /proyectos/localidades — las localidades ya cargadas en los proyectos
 * ACTIVOS, sin repetir, para el filtro del listado (OBS-23: la localidad es
 * texto libre, no hay una lista fija).
 */
export async function listarLocalidadesProyecto(
  signal?: AbortSignal
): Promise<LocalidadCatalogoItem[]> {
  const { data } = await httpClient.get<LocalidadCatalogoItem[]>('/proyectos/localidades', {
    signal,
  })
  return data
}

/** POST /proyectos — alta. Devuelve el detalle del proyecto creado, con su código ya generado. */
export async function crearProyecto(payload: CrearProyectoPayload): Promise<ProyectoDetalle> {
  const { data } = await httpClient.post<ProyectoDetalle>('/proyectos', payload)
  return data
}

/** PATCH /proyectos/:id — edición parcial. */
export async function editarProyecto(
  id: number,
  payload: EditarProyectoPayload
): Promise<ProyectoDetalle> {
  const { data } = await httpClient.patch<ProyectoDetalle>(`/proyectos/${id}`, payload)
  return data
}

/** PATCH /proyectos/:id/estado-obra — avanza al estado inmediatamente siguiente; no hay retroceso. */
export async function cambiarEstadoObraProyecto(
  id: number,
  estadoObra: EstadoObraDestino
): Promise<ProyectoDetalle> {
  const { data } = await httpClient.patch<ProyectoDetalle>(`/proyectos/${id}/estado-obra`, {
    estado_obra: estadoObra,
  })
  return data
}

/** PATCH /proyectos/:id/baja — baja lógica. No hay reactivación. */
export async function darDeBajaProyecto(id: number): Promise<ProyectoDetalle> {
  const { data } = await httpClient.patch<ProyectoDetalle>(`/proyectos/${id}/baja`)
  return data
}

/** POST /proyectos/:id/imagenes — asocia al proyecto una imagen ya subida al almacenamiento. */
export async function agregarImagenProyecto(
  id: number,
  payload: AgregarImagenProyectoPayload
): Promise<ProyectoDetalle> {
  const { data } = await httpClient.post<ProyectoDetalle>(`/proyectos/${id}/imagenes`, payload)
  return data
}

/**
 * PATCH /proyectos/:id/imagenes/orden — recibe los ids de TODAS las imágenes
 * (renders y planos juntos) en el orden nuevo: el orden es uno solo.
 */
export async function ordenarImagenesProyecto(
  id: number,
  idsImagenProyecto: number[]
): Promise<ProyectoDetalle> {
  const { data } = await httpClient.patch<ProyectoDetalle>(`/proyectos/${id}/imagenes/orden`, {
    ids_imagen_proyecto: idsImagenProyecto,
  })
  return data
}

/** DELETE /proyectos/:id/imagenes/:idImagen — borrado físico de la imagen de la galería. */
export async function quitarImagenProyecto(id: number, idImagen: number): Promise<ProyectoDetalle> {
  const { data } = await httpClient.delete<ProyectoDetalle>(`/proyectos/${id}/imagenes/${idImagen}`)
  return data
}
