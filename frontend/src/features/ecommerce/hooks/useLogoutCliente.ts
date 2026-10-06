import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clearClienteAccessToken } from '@/shared/api/httpClientCliente'
import { AUTH_CLIENTE_QUERY_KEYS, logoutCliente } from '../services/clienteAuth.service'
import type { Cliente } from '../types/cliente.types'
import { limpiarSesionCliente } from '../utils/sessionClienteFlag'

export function useLogoutCliente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logoutCliente,
    // onSettled (no onSuccess): el logout del lado del cliente tiene que
    // pasar siempre, aunque el backend no responda — si no, el usuario
    // quedaría trabado con una sesión que no puede cerrar.
    onSettled: () => {
      clearClienteAccessToken()
      limpiarSesionCliente()
      // setQueryData (no removeQueries): el header sigue montado y observando
      // esta query. removeQueries dispara un refetch inmediato contra un
      // token que recién se limpió — 401 seguro. setQueryData solo actualiza
      // el valor cacheado, sin refetch.
      queryClient.setQueryData<Cliente | null>(AUTH_CLIENTE_QUERY_KEYS.ME, null)
    },
  })
}
