import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AUTH_QUERY_KEYS } from '@/features/auth/services/auth.service'
import type { User } from '@/features/auth/types/auth.types'
import { setUnauthorizedHandler } from '@/shared/api/httpClient'
import type { ApiErrorResponse } from '@/shared/types/api.types'

interface QueryProviderProps {
  children: ReactNode
}

function esErrorDeAutenticacion(error: unknown): boolean {
  const statusCode = (error as Partial<ApiErrorResponse> | undefined)?.statusCode
  return statusCode === 401 || statusCode === 403
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 60_000,
            retry: (failureCount, error) => {
              if (esErrorDeAutenticacion(error)) return false
              return failureCount < 1
            },
          },
        },
      })
  )

  useEffect(() => {
    // Se registra en cada mount (incluido el doble mount de StrictMode en
    // dev): es una asignación simple "el último gana" sobre el mismo
    // queryClient, no hace falta cleanup.
    setUnauthorizedHandler(() => {
      // setQueryData (no removeQueries): ProtectedRoute/Header siguen
      // observando esta query activamente. removeQueries la destruye, y
      // un observer activo sin datos dispara un refetch inmediato — contra
      // una sesión que ya sabemos muerta, eso es un loop infinito contra
      // el backend. setQueryData solo actualiza el valor cacheado.
      queryClient.setQueryData<User | null>(AUTH_QUERY_KEYS.ME, null)
    })
  }, [queryClient])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
