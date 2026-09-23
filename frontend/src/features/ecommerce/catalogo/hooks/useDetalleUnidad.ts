import { useQuery } from '@tanstack/react-query'
import {
  CATALOGO_PUBLICO_QUERY_KEYS,
  obtenerDetalleUnidad,
} from '@/features/ecommerce/services/catalogoPublico.service'
import type { UnidadCatalogoDetalle } from '@/features/ecommerce/types/catalogoPublico.types'
import type { ApiErrorResponse } from '@/shared/types/api.types'

/**
 * Detalle público de una unidad. `retry: false`: el 404 (no existe, o dejó de
 * estar disponible) es una respuesta válida que la pantalla muestra como
 * "no encontramos esta unidad", no un fallo que convenga reintentar.
 */
export function useDetalleUnidad(idUnidadFuncional: number) {
  return useQuery<UnidadCatalogoDetalle, ApiErrorResponse>({
    queryKey: CATALOGO_PUBLICO_QUERY_KEYS.DETALLE(idUnidadFuncional),
    queryFn: ({ signal }) => obtenerDetalleUnidad(idUnidadFuncional, signal),
    enabled: Number.isInteger(idUnidadFuncional) && idUnidadFuncional > 0,
    retry: false,
  })
}
