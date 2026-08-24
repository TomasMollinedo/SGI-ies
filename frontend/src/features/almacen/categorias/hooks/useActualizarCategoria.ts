import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { actualizarCategoria, CATEGORIAS_QUERY_KEYS } from '../services/categorias.service'
import type { ActualizarCategoriaInput, Categoria } from '../types/categoria.types'

interface ActualizarCategoriaVariables {
  id: number
  input: ActualizarCategoriaInput
}

export function useActualizarCategoria() {
  const queryClient = useQueryClient()

  return useMutation<Categoria, ApiErrorResponse, ActualizarCategoriaVariables>({
    mutationFn: ({ id, input }) => actualizarCategoria(id, input),
    onSuccess: (_categoria, { id }) => {
      queryClient.invalidateQueries({ queryKey: CATEGORIAS_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: CATEGORIAS_QUERY_KEYS.detail(id) })
    },
  })
}
