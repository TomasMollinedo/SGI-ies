import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import {
  CONSULTAS_CLIENTE_QUERY_KEYS,
  enviarConsulta,
  listarMisConsultas,
} from '../services/consulta.service'
import type { Consulta, CrearConsultaPayload, MisConsultasQuery } from '../types/consulta.types'

/** Historial de consultas del cliente autenticado (sección "Mis consultas" del perfil). */
export function useMisConsultas(filtros: MisConsultasQuery) {
  return useQuery<PaginatedResponse<Consulta>, ApiErrorResponse>({
    queryKey: CONSULTAS_CLIENTE_QUERY_KEYS.MIS_CONSULTAS(filtros),
    queryFn: ({ signal }) => listarMisConsultas(filtros, signal),
    placeholderData: keepPreviousData,
  })
}

/**
 * Envía una consulta. No muestra ningún mensaje de éxito por su cuenta: lo
 * decide `EnviarConsulta`, que es quien sabe que hay que limpiar el
 * formulario y dejarlo disponible para otra consulta.
 */
export function useEnviarConsulta() {
  const queryClient = useQueryClient()

  return useMutation<Consulta, ApiErrorResponse, CrearConsultaPayload>({
    mutationFn: enviarConsulta,
    onSuccess: () => {
      // Para que el historial del perfil ya muestre la consulta recién
      // enviada la próxima vez que se pida (misma pestaña u otra).
      queryClient.invalidateQueries({ queryKey: ['consultas-cliente', 'mis-consultas'] })
    },
  })
}
