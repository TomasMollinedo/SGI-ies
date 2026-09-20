import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setClienteAccessToken } from '@/shared/api/httpClientCliente'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { AUTH_CLIENTE_QUERY_KEYS, loginCliente } from '../services/clienteAuth.service'
import type { LoginClienteResponse } from '../types/cliente.types'
import { marcarSesionCliente } from '../utils/sessionClienteFlag'

/** La variable de la mutation es el `id_token` que devuelve Google Identity Services. */
export function useLoginCliente() {
  const queryClient = useQueryClient()

  return useMutation<LoginClienteResponse, ApiErrorResponse, string>({
    mutationFn: loginCliente,
    onSuccess: (data) => {
      setClienteAccessToken(data.accessToken)
      // El shape de `cliente` es idéntico al de GET /cliente/me, evita un
      // round-trip extra apenas se loguea.
      queryClient.setQueryData(AUTH_CLIENTE_QUERY_KEYS.ME, data.cliente)
      marcarSesionCliente()
    },
  })
}
