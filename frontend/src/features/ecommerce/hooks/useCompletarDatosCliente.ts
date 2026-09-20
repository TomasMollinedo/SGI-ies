import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { AUTH_CLIENTE_QUERY_KEYS, completarDatosCliente } from '../services/clienteAuth.service'
import type { Cliente, CompletarDatosClientePayload } from '../types/cliente.types'

export function useCompletarDatosCliente() {
  const queryClient = useQueryClient()

  return useMutation<Cliente, ApiErrorResponse, CompletarDatosClientePayload>({
    mutationFn: ({ dni_cuil, telefono }) => completarDatosCliente(dni_cuil, telefono),
    onSuccess: (cliente) => {
      // El PATCH devuelve el cliente actualizado: se reemplaza en la caché en
      // vez de invalidar, así ClienteProtectedRoute ve los datos completos
      // sin un round-trip extra a /cliente/me.
      queryClient.setQueryData(AUTH_CLIENTE_QUERY_KEYS.ME, cliente)
    },
  })
}
