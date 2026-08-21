export interface User {
  id: number
  nombre: string
  apellido: string
  email: string
  rol: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  usuario: User
}

export interface RefreshResponse {
  accessToken: string
}

export interface LogoutResponse {
  message: string
}
