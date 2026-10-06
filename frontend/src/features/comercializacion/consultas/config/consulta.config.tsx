import { Badge } from '@/shared/components/ui/Badge'
import type { SelectOption } from '@/shared/components/ui/Select'
import type { EstadoConsulta } from '../types/consulta.types'

/** Resultados por página de la cola. Fijo, igual que en el resto de los listados. */
export const LIMITE_PAGINA = 10

/** Cuánto espera el filtro de identificador antes de pegarle al backend. */
export const DEBOUNCE_BUSQUEDA = 400

export const ESTADO_CONSULTA_LABEL: Record<EstadoConsulta, string> = {
  PENDIENTE: 'Pendiente',
  RESPONDIDA: 'Respondida',
}

export const OPCIONES_ESTADO: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'RESPONDIDA', label: 'Respondida' },
]

export function esEstadoConsulta(valor: string): valor is EstadoConsulta {
  return valor === 'PENDIENTE' || valor === 'RESPONDIDA'
}

/** Pendiente en amarillo (necesita acción); Respondida en verde (resuelta). */
export function badgeEstadoConsulta(estado: EstadoConsulta) {
  return (
    <Badge variant={estado === 'RESPONDIDA' ? 'active' : 'warning'}>
      {ESTADO_CONSULTA_LABEL[estado]}
    </Badge>
  )
}
