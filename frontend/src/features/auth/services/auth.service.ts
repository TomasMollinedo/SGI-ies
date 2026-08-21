import { httpClient } from '@/shared/api/httpClient'
import type {
  AuthResponse,
  LoginCredentials,
  LogoutResponse,
  RefreshResponse,
  User,
} from '../types/auth.types'

export const AUTH_QUERY_KEYS = {
  ME: ['auth', 'me'] as const,
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const { data } = await httpClient.post<AuthResponse>('/auth/login', credentials)
  return data
}

export async function refresh(): Promise<RefreshResponse> {
  const { data } = await httpClient.post<RefreshResponse>('/auth/refresh')
  return data
}

export async function logout(): Promise<LogoutResponse> {
  const { data } = await httpClient.post<LogoutResponse>('/auth/logout')
  return data
}

export async function getMe(): Promise<User> {
  const { data } = await httpClient.get<User>('/auth/me')
  return data
}
