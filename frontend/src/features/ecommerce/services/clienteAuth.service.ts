import { httpClientCliente } from '@/shared/api/httpClientCliente'
import type {
  Cliente,
  CompletarDatosClientePayload,
  LoginClienteResponse,
  LogoutClienteResponse,
  RefreshClienteResponse,
} from '../types/cliente.types'

export const AUTH_CLIENTE_QUERY_KEYS = {
  ME: ['auth-cliente', 'me'] as const,
}

export async function loginCliente(idToken: string): Promise<LoginClienteResponse> {
  const { data } = await httpClientCliente.post<LoginClienteResponse>('/cliente/login', {
    idToken,
  })
  return data
}

export async function refreshCliente(): Promise<RefreshClienteResponse> {
  const { data } = await httpClientCliente.post<RefreshClienteResponse>('/cliente/refresh')
  return data
}

export async function logoutCliente(): Promise<LogoutClienteResponse> {
  const { data } = await httpClientCliente.post<LogoutClienteResponse>('/cliente/logout')
  return data
}

export async function getMeCliente(): Promise<Cliente> {
  const { data } = await httpClientCliente.get<Cliente>('/cliente/me')
  return data
}

export async function completarDatosCliente(dni_cuil: string, telefono: string): Promise<Cliente> {
  const payload: CompletarDatosClientePayload = { dni_cuil, telefono }
  const { data } = await httpClientCliente.patch<Cliente>('/cliente/me', payload)
  return data
}
