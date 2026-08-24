import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { CATEGORIAS_QUERY_KEYS, darDeAlta } from '../services/categorias.service'
import type { Categoria } from '../types/categoria.types'

export function useDarAltaCategoria() {
  const queryClient = useQueryClient()

  return useMutation<Categoria, ApiErrorResponse, number>({
    mutationFn: darDeAlta,
    onSuccess: (_categoria, id) => {
      queryClient.invalidateQueries({ queryKey: CATEGORIAS_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: CATEGORIAS_QUERY_KEYS.detail(id) })
    },
  })
}
