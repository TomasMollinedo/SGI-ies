import { env } from '@/config/env'
import { createHttpClientConSesion } from './createHttpClientConSesion'

export const {
  client: httpClientCliente,
  getAccessToken: getClienteAccessToken,
  setAccessToken: setClienteAccessToken,
  clearAccessToken: clearClienteAccessToken,
  setUnauthorizedHandler: setUnauthorizedHandlerCliente,
} = createHttpClientConSesion({
  refreshUrl: `${env.apiUrl}/cliente/refresh`,
  excludedPaths: ['/cliente/login', '/cliente/refresh'],
})
