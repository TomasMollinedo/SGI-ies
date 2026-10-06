import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import type { FiltroEstado } from '../types/plazoFinanciacion.types'

interface FiltroEstadoPlazosBarProps {
  estado: FiltroEstado
  onEstadoChange: (valor: FiltroEstado) => void
}

/**
 * Las tres opciones que acepta el backend. No hay una cuarta "sin filtro": el
 * listado siempre manda el parámetro, porque omitirlo trae solo los activos.
 */
const OPCIONES_ESTADO: SelectOption[] = [
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
  { value: 'todos', label: 'Todos los plazos' },
]

/** Filtro del listado de plazos: solo por estado, que es lo único que filtra el backend. */
export function FiltroEstadoPlazosBar({ estado, onEstadoChange }: FiltroEstadoPlazosBarProps) {
  return (
    <Select
      size="sm"
      options={OPCIONES_ESTADO}
      aria-label="Filtrar por estado"
      value={estado}
      onChange={(evento) => onEstadoChange(evento.target.value as FiltroEstado)}
      className="w-50"
    />
  )
}
