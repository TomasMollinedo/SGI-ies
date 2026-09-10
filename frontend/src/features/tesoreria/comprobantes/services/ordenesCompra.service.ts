import { httpClient } from '@/shared/api/httpClient'
import type { PaginatedResponse } from '@/shared/types/api.types'
import type { OrdenCompra } from '@/features/compras/ordenes-compra/types/ordenCompra.types'

/**
 * Fila del listado de órdenes de compra (GET /ordenes-compra): la orden sin su
 * detalle línea por línea.
 */
export type OrdenCompraListItem = Omit<OrdenCompra, 'detalles'>

/** Query params de GET /ordenes-compra que usa el selector del comprobante. */
export interface OrdenesCompraQuery {
  FK_proveedor?: number
  page?: number
  limit?: number
}

/**
 * GET /ordenes-compra — solo para poblar el selector de "orden de compra
 * vinculada" del formulario de comprobante. Es un cliente de listado mínimo y
 * local: cuando la feature `compras/ordenes-compra` tenga su propio hook de
 * listado, este archivo se reemplaza por ese.
 */
export async function listarOrdenesCompra(
  filtros: OrdenesCompraQuery,
  signal?: AbortSignal
): Promise<PaginatedResponse<OrdenCompraListItem>> {
  const { data } = await httpClient.get<PaginatedResponse<OrdenCompraListItem>>('/ordenes-compra', {
    params: {
      FK_proveedor: filtros.FK_proveedor,
      page: filtros.page,
      limit: filtros.limit,
    },
    signal,
  })

  return data
}