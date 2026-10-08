import { useMutation } from '@tanstack/react-query'
import { simularPlan } from '@/features/ecommerce/services/catalogoPublico.service'
import type {
  SimulacionCatalogo,
  SimularPlanPayload,
} from '@/features/ecommerce/types/catalogoPublico.types'
import type { ApiErrorResponse } from '@/shared/types/api.types'

/**
 * Simulación libre de una unidad. Es una mutation porque es un POST con body,
 * pero no cambia nada en el servidor ni invalida ninguna query.
 */
export function useSimularPlan(idUnidadFuncional: number) {
  return useMutation<SimulacionCatalogo, ApiErrorResponse, SimularPlanPayload>({
    mutationFn: (payload) => simularPlan(idUnidadFuncional, payload),
  })
}
