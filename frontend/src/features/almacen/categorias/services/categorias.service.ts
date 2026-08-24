import { httpClient } from '@/shared/api/httpClient'
import type {
  Categoria,
  CategoriaDetalle,
  FiltrosCategorias,
  CategoriasPaginadas,
  CrearCategoriaInput,
  ActualizarCategoriaInput,
} from '../types/categoria.types'

export const CATEGORIAS_QUERY_KEYS = {
  lists: () => ['categorias', 'list'] as const,
  list: (filtros: FiltrosCategorias) => ['categorias', 'list', filtros] as const,
  detail: (id: number) => ['categorias', 'detail', id] as const,
}

export async function listarCategorias(filtros: FiltrosCategorias): Promise<CategoriasPaginadas> {
  const { data } = await httpClient.get<CategoriasPaginadas>('/categorias', { params: filtros })
  return data
}

export async function crearCategoria(input: CrearCategoriaInput): Promise<Categoria> {
  const { data } = await httpClient.post<Categoria>('/categorias', input)
  return data
}

export async function obtenerCategoria(id: number): Promise<CategoriaDetalle> {
  const { data } = await httpClient.get<CategoriaDetalle>(`/categorias/${id}`)
  return data
}

export async function actualizarCategoria(
  id: number,
  input: ActualizarCategoriaInput
): Promise<Categoria> {
  const { data } = await httpClient.patch<Categoria>(`/categorias/${id}`, input)
  return data
}

export async function darDeBaja(id: number): Promise<Categoria> {
  const { data } = await httpClient.patch<Categoria>(`/categorias/${id}/baja`)
  return data
}

export async function darDeAlta(id: number): Promise<Categoria> {
  const { data } = await httpClient.patch<Categoria>(`/categorias/${id}/alta`)
  return data
}
