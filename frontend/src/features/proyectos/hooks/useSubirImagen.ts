import { useMutation } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { subirImagen } from '@/features/proyectos/services/almacenamiento.service'

/** Sube el archivo al almacenamiento de objetos (T97). Todavía no lo asocia a ninguna galería. */
export function useSubirImagen() {
  return useMutation<{ url: string }, ApiErrorResponse, File>({
    mutationFn: subirImagen,
  })
}
