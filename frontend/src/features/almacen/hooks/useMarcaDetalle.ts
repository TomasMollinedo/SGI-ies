import { useQuery } from '@tanstack/react-query'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { MARCAS_QUERY_KEYS, obtenerMarca } from '../services/marcas.service'
import type { MarcaDetalle } from '../types/marca.types'

/**
 * Detalle de una marca. Con `id` en `null` (modal cerrado) la query queda
 * deshabilitada y, como el id es parte de la key, tampoco arrastra el estado
 * de la marca anterior.
 */
export function useMarcaDetalle(id: number | null) {
  return useQuery<MarcaDetalle, ApiErrorResponse>({
    queryKey: MARCAS_QUERY_KEYS.DETALLE(id),
    // El `!` es seguro: con `id` en `null` la query no corre (`enabled`).
    queryFn: ({ signal }) => obtenerMarca(id!, signal),
    enabled: id !== null,
  })
}
