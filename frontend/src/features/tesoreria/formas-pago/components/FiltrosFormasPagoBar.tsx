import { Search } from 'lucide-react'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import type { FiltroEstado } from '../types/formaPago.types'

interface FiltrosFormasPagoBarProps {
  nombre: string
  onNombreChange: (valor: string) => void
  estado: FiltroEstado
  onEstadoChange: (valor: FiltroEstado) => void
}

/**
 * Las tres opciones que acepta el backend. No hay una cuarta "sin filtro": el
 * listado siempre manda el parámetro, porque omitirlo trae solo las activas.
 */
const OPCIONES_ESTADO: SelectOption[] = [
  { value: 'true', label: 'Activas' },
  { value: 'false', label: 'Inactivas' },
  { value: 'todos', label: 'Todas las formas de pago' },
]

/** Barra de filtros del listado de formas de pago: búsqueda por nombre y estado. */
export function FiltrosFormasPagoBar({
  nombre,
  onNombreChange,
  estado,
  onEstadoChange,
}: FiltrosFormasPagoBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        size="sm"
        type="search"
        placeholder="Buscar por nombre"
        aria-label="Buscar formas de pago"
        iconLeft={<Search />}
        value={nombre}
        onChange={(evento) => onNombreChange(evento.target.value)}
        className="w-64"
      />
      <Select
        size="sm"
        options={OPCIONES_ESTADO}
        aria-label="Filtrar por estado"
        value={estado}
        onChange={(evento) => onEstadoChange(evento.target.value as FiltroEstado)}
        // Más ancho que el resto de los filtros de estado: "Todas las formas de
        // pago" no entra en el w-50 que usan los que dicen solo "Todos".
        className="w-60"
      />
    </div>
  )
}
