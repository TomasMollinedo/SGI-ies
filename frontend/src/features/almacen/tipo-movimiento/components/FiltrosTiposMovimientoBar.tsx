import { Search } from 'lucide-react'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import type { FiltroEstado, FiltroIndicador } from '../types/tipoMovimiento.types'

interface FiltrosTiposMovimientoBarProps {
  nombre: string
  onNombreChange: (valor: string) => void
  estado: FiltroEstado
  onEstadoChange: (valor: FiltroEstado) => void
  indicador: FiltroIndicador
  onIndicadorChange: (valor: FiltroIndicador) => void
}

const OPCIONES_ESTADO: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
]

const OPCIONES_INDICADOR: SelectOption[] = [
  { value: '', label: 'Todos los indicadores' },
  { value: 'true', label: 'Entrada' },
  { value: 'false', label: 'Salida' },
]

/** Barra de filtros del listado de tipos de movimiento: nombre, estado e indicador. */
export function FiltrosTiposMovimientoBar({
  nombre,
  onNombreChange,
  estado,
  onEstadoChange,
  indicador,
  onIndicadorChange,
}: FiltrosTiposMovimientoBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        size="sm"
        type="search"
        placeholder="Buscar por nombre"
        aria-label="Buscar tipos de movimiento"
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
        className="w-50"
      />
      <Select
        size="sm"
        options={OPCIONES_INDICADOR}
        aria-label="Filtrar por indicador"
        value={indicador}
        onChange={(evento) => onIndicadorChange(evento.target.value as FiltroIndicador)}
        className="w-60"
      />
    </div>
  )
}
