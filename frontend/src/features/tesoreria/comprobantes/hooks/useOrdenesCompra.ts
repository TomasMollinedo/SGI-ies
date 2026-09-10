import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  listarOrdenesCompra,
  type OrdenCompraListItem,
  type OrdenesCompraQuery,
} from '../services/ordenesCompra.service'

/**
 * Listado de órdenes de compra para el selector del formulario de comprobante.
 * Local y temporal — ver `services/ordenesCompra.service.ts`.
 */
export function useOrdenesCompra(filtros: OrdenesCompraQuery, opciones?: { enabled?: boolean }) {
  return useQuery<PaginatedResponse<OrdenCompraListItem>, ApiErrorResponse>({
    queryKey: ['comprobantes', 'ordenes-compra-vinculables', filtros],
    queryFn: ({ signal }) => listarOrdenesCompra(filtros, signal),
    placeholderData: keepPreviousData,
    enabled: opciones?.enabled,
  })
}