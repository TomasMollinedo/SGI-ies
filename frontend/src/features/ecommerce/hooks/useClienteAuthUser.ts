import { useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { AUTH_CLIENTE_QUERY_KEYS, getMeCliente } from '../services/clienteAuth.service'
import type { Cliente } from '../types/cliente.types'
import { haySesionClientePrevia } from '../utils/sessionClienteFlag'

/**
 * Chequea la sesión de cliente activa contra GET /cliente/me. Mismo criterio
 * que useAuthUser (staff): retry:false + staleTime/gcTime:Infinity, la única
 * forma de invalidar este query es login/logout de cliente o un refresh
 * fallido (ver QueryProvider).
 *
 * `enabled` evita consultar al backend si este navegador nunca tuvo sesión
 * de cliente. Ojo: una query deshabilitada sin datos queda en `isPending`
 * (v5) con `fetchStatus: 'idle'` — quien decida si mostrar un spinner tiene
 * que mirar `isLoading`, no `isPending`.
 */
export function useClienteAuthUser() {
  return useQuery<Cliente | null, ApiErrorResponse>({
    queryKey: AUTH_CLIENTE_QUERY_KEYS.ME,
    queryFn: getMeCliente,
    enabled: haySesionClientePrevia(),
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
