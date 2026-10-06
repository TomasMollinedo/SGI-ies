import type { EstadoProyecto } from '../types/proyecto.types'

export const ESTADO_PROYECTO_LABEL: Record<EstadoProyecto, string> = {
  EN_PLANIFICACION: 'En planificación',
  EN_EJECUCION: 'En ejecución',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}
