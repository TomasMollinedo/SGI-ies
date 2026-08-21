import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { clearAccessToken } from '@/shared/api/httpClient'
import { AUTH_QUERY_KEYS, logout } from '../services/auth.service'
import type { User } from '../types/auth.types'

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: logout,
    // onSettled (no onSuccess): el logout del lado del cliente tiene que
    // pasar siempre, aunque la llamada al backend falle (ej. el access
    // token ya expiró) — purgar el token en memoria es responsabilidad
    // del frontend, el backend no lo puede revocar por su cuenta.
    onSettled: () => {
      clearAccessToken()
      // setQueryData (no removeQueries): Header/ProtectedRoute siguen
      // montados en este instante. removeQueries dispara un refetch
      // inmediato de /auth/me porque el observer sigue activo, contra un
      // token que recién se limpió — 401 seguro. setQueryData solo
      // actualiza el valor cacheado, sin refetch.
      queryClient.setQueryData<User | null>(AUTH_QUERY_KEYS.ME, null)
      navigate(PATHS.LOGIN, { replace: true })
    },
  })
}
