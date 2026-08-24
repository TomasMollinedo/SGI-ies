import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { CATEGORIAS_QUERY_KEYS, crearCategoria } from '../services/categorias.service'
import type { Categoria, CrearCategoriaInput } from '../types/categoria.types'

export function useCrearCategoria() {
  const queryClient = useQueryClient()

  return useMutation<Categoria, ApiErrorResponse, CrearCategoriaInput>({
    mutationFn: crearCategoria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIAS_QUERY_KEYS.lists() })
    },
  })
}
