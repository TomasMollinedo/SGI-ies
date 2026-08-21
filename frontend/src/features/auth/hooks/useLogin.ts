import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setAccessToken } from '@/shared/api/httpClient'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { AUTH_QUERY_KEYS, login } from '../services/auth.service'
import type { AuthResponse, LoginCredentials } from '../types/auth.types'

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation<AuthResponse, ApiErrorResponse, LoginCredentials>({
    mutationFn: login,
    onSuccess: (data) => {
      setAccessToken(data.accessToken)
      // El shape de `usuario` es idéntico al de User (GET /auth/me), evita
      // un round-trip extra a /me apenas se loguea.
      queryClient.setQueryData(AUTH_QUERY_KEYS.ME, data.usuario)
    },
  })
}
