import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type {
  CondicionIva,
  CrearProveedorPayload,
  Proveedor,
  ProveedorDetalle,
  ProveedoresQuery,
} from '../types/proveedor.types'

export const PROVEEDORES_QUERY_KEYS = {
  LISTA: (filtros: ProveedoresQuery) => ['proveedores', 'lista', filtros] as const,
  DETALLE: (id: number | null) => ['proveedores', 'detalle', id] as const,
  CONDICIONES_IVA: ['proveedores', 'condiciones-iva'] as const,
}

/**
 * GET /proveedores. El `signal` viene de React Query: cuando cambian los
 * filtros, el request anterior se aborta y no puede pisar al nuevo.
 */
export async function listarProveedores(
  filtros: ProveedoresQuery,
  signal?: AbortSignal
): Promise<PaginatedResponse<Proveedor>> {
  const { data } = await httpClient.get<PaginatedResponse<Proveedor>>('/proveedores', {
    params: {
      busqueda: filtros.busqueda,
      condicion_iva: filtros.condicionIva,
      estado: filtros.estado,
      page: filtros.page,
      limit: filtros.limit,
    },
    signal,
  })

  return data
}

/** GET /proveedores/:id — el proveedor con su trazabilidad, para el modal de detalle. */
export async function obtenerProveedor(
  id: number,
  signal?: AbortSignal
): Promise<ProveedorDetalle> {
  const { data } = await httpClient.get<ProveedorDetalle>(`/proveedores/${id}`, { signal })
  return data
}

/** GET /proveedores/condiciones-iva — catálogo para el filtro de condición frente al IVA. */
export async function listarCondicionesIva(signal?: AbortSignal): Promise<CondicionIva[]> {
  const { data } = await httpClient.get<CondicionIva[]>('/proveedores/condiciones-iva', { signal })
  return data
}

export async function crearProveedor(payload: CrearProveedorPayload): Promise<Proveedor> {
  const { data } = await httpClient.post<Proveedor>('/proveedores', payload)
  return data
}

/** PATCH /proveedores/:id/baja — baja lógica. Sin body; devuelve el proveedor ya actualizado. */
export async function darDeBajaProveedor(id: number): Promise<Proveedor> {
  const { data } = await httpClient.patch<Proveedor>(`/proveedores/${id}/baja`)
  return data
}

/** PATCH /proveedores/:id/alta — reactivación. Sin body; devuelve el proveedor ya actualizado. */
export async function reactivarProveedor(id: number): Promise<Proveedor> {
  const { data } = await httpClient.patch<Proveedor>(`/proveedores/${id}/alta`)
  return data
}
