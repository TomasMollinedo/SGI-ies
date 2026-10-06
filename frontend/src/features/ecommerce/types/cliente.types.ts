/** Cliente del ecommerce tal como lo expone el backend (ClienteResponseDto). */
export interface Cliente {
  id: number
  nombre: string
  apellido: string | null
  email: string
  /** Null hasta que el cliente completa sus datos (HU-29). */
  dni_cuil: string | null
  /** Null hasta que el cliente completa sus datos (HU-29). */
  telefono: string | null
}

export interface LoginClienteResponse {
  accessToken: string
  cliente: Cliente
}

export interface RefreshClienteResponse {
  accessToken: string
}

export interface LogoutClienteResponse {
  message: string
}

/**
 * El backend acepta cualquier subconjunto de estos campos, pero el flujo de
 * "completar datos" siempre manda los cuatro.
 */
export interface CompletarDatosClientePayload {
  nombre: string
  apellido: string
  dni_cuil: string
  telefono: string
}
