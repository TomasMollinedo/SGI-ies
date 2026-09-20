import type { ApiErrorResponse } from '@/shared/types/api.types'

/**
 * El 409 de "la unidad ya tiene una publicación vigente" adjunta
 * `datos: { id_publicacion_vigente }`. Devuelve ese id, o `null` si el error es
 * otro (o si `datos` no trae la forma esperada).
 */
export function extraerIdPublicacionVigente(error: ApiErrorResponse): number | null {
  if (error.statusCode !== 409) return null
  const { datos } = error
  if (typeof datos !== 'object' || datos === null) return null
  const id = (datos as Record<string, unknown>).id_publicacion_vigente
  return typeof id === 'number' ? id : null
}
