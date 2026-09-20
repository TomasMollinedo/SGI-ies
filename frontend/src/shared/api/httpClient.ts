import { env } from '@/config/env'
import { createHttpClientConSesion } from './createHttpClientConSesion'

export const {
  client: httpClient,
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  setUnauthorizedHandler,
} = createHttpClientConSesion({
  refreshUrl: `${env.apiUrl}/auth/refresh`,
  excludedPaths: ['/auth/login', '/auth/refresh'],
})
