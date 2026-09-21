import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { env } from '@/config/env'
import type { ApiErrorResponse } from '@/shared/types/api.types'

type UnauthorizedHandler = () => void

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

interface QueuedRequest {
  resolve: (token: string) => void
  reject: (error: unknown) => void
}

interface CreateHttpClientConSesionOptions {
  /** URL absoluta del endpoint que renueva el access token con la cookie de refresh. */
  refreshUrl: string
  /**
   * Fragmentos de URL (ej. '/auth/login') cuyo 401 no dispara refresh: es un
   * rechazo genuino del endpoint, no un access token vencido.
   */
  excludedPaths: string[]
}

function normalizeError(error: unknown): ApiErrorResponse {
  if (axios.isAxiosError(error) && error.response?.data) {
    return error.response.data as ApiErrorResponse
  }

  return {
    statusCode: 0,
    message: 'No se pudo conectar con el servidor.',
    error: 'NetworkError',
    timestamp: new Date().toISOString(),
    path: '',
  }
}

/**
 * Crea una instancia de axios con una sesión propia: access token en memoria,
 * header Authorization automático y refresh transparente ante un 401. Todo el
 * estado (token, handler, cola de reintentos) vive en el closure de cada
 * llamada, así que dos sesiones (ej. staff y cliente) no se pisan entre sí.
 */
export function createHttpClientConSesion({
  refreshUrl,
  excludedPaths,
}: CreateHttpClientConSesionOptions) {
  let accessToken: string | null = null
  let unauthorizedHandler: UnauthorizedHandler | null = null
  let isRefreshing = false
  let failedQueue: QueuedRequest[] = []

  function getAccessToken(): string | null {
    return accessToken
  }

  function setAccessToken(token: string | null): void {
    accessToken = token
  }

  function clearAccessToken(): void {
    accessToken = null
  }

  /**
   * Registra el callback que corre cuando el refresh falla y la sesión termina
   * de forma irrecuperable. Puede dispararse más de una vez si había varios
   * requests en vuelo al momento del fallo, así que el handler tiene que ser
   * idempotente (ej. limpiar cache que ya está limpia no debe romper nada).
   */
  function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
    unauthorizedHandler = handler
  }

  const client = axios.create({
    baseURL: env.apiUrl,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
  })

  client.interceptors.request.use((config) => {
    if (accessToken) {
      config.headers.set('Authorization', `Bearer ${accessToken}`)
    }
    return config
  })

  function processQueue(error: unknown, token: string | null): void {
    for (const { resolve, reject } of failedQueue) {
      if (error || !token) {
        reject(error)
      } else {
        resolve(token)
      }
    }
    failedQueue = []
  }

  async function solicitarNuevoAccessToken(): Promise<string> {
    // Instancia axios cruda (sin interceptores) para no reentrar en este mismo
    // interceptor si /auth/refresh también devolviera 401.
    const { data } = await axios.post<{ accessToken: string }>(refreshUrl, undefined, {
      withCredentials: true,
    })
    return data.accessToken
  }

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as RetryableRequestConfig | undefined
      const esEndpointDeAuth = excludedPaths.some(
        (path) => originalRequest?.url?.includes(path) === true
      )

      if (
        error.response?.status === 401 &&
        originalRequest &&
        !originalRequest._retry &&
        !esEndpointDeAuth
      ) {
        if (isRefreshing) {
          try {
            const token = await new Promise<string>((resolve, reject) => {
              failedQueue.push({ resolve, reject })
            })
            originalRequest._retry = true
            originalRequest.headers.set('Authorization', `Bearer ${token}`)
            return await client(originalRequest)
          } catch (queueError) {
            return await Promise.reject(normalizeError(queueError))
          }
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          const nuevoToken = await solicitarNuevoAccessToken()
          setAccessToken(nuevoToken)
          processQueue(null, nuevoToken)
          originalRequest.headers.set('Authorization', `Bearer ${nuevoToken}`)
          return await client(originalRequest)
        } catch (refreshError) {
          processQueue(refreshError, null)
          clearAccessToken()
          // Se difiere con setTimeout: el request que disparó este refresh
          // puede ser el mismo /auth/me que el handler termina invalidando.
          // Si se llama de forma síncrona, se toca la cache de esa query
          // mientras todavía está resolviéndose sola; con setTimeout ya
          // terminó de resolver naturalmente antes de tocarla.
          setTimeout(() => unauthorizedHandler?.(), 0)
          return await Promise.reject(normalizeError(refreshError))
        } finally {
          isRefreshing = false
        }
      }

      return await Promise.reject(normalizeError(error))
    }
  )

  return { client, getAccessToken, setAccessToken, clearAccessToken, setUnauthorizedHandler }
}
