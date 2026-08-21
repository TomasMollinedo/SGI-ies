import { useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { AUTH_QUERY_KEYS, getMe } from '../services/auth.service'
import type { User } from '../types/auth.types'

/**
 * Chequea la sesión activa contra GET /auth/me. Se usa tanto en ProtectedRoute
 * como en Header, así que retry:false + staleTime/gcTime:Infinity evitan
 * refetches y loading flashes de más — la única forma de invalidar este
 * query es login/logout o un refresh fallido (ver QueryProvider).
 */
export function useAuthUser() {
  return useQuery<User | null, ApiErrorResponse>({
    queryKey: AUTH_QUERY_KEYS.ME,
    queryFn: getMe,
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
