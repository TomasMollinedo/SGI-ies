import type { EstadoConsulta } from '../types/consulta.types'

/**
 * Mismo límite que valida el backend (`create-consulta.dto.ts` /
 * `responder-consulta.dto.ts`, `MAX_LARGO_TEXTO`/`MAX_LARGO_RESPUESTA`): si
 * cambia ahí, cambiarlo acá también, o el contador del front queda mintiendo.
 */
export const MAX_LARGO_CONSULTA = 1000

export const ESTADO_CONSULTA_LABEL: Record<EstadoConsulta, string> = {
  PENDIENTE: 'Pendiente',
  RESPONDIDA: 'Respondida',
}
