import { Search } from 'lucide-react'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import type { FiltroEstado } from '../types/marca.types'

interface FiltrosMarcasBarProps {
  nombre: string
  onNombreChange: (valor: string) => void
  estado: FiltroEstado
  onEstadoChange: (valor: FiltroEstado) => void
}

const OPCIONES_ESTADO: SelectOption[] = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Activo' },
  { value: 'false', label: 'Inactivo' },
]

/** Barra de filtros del listado de marcas: nombre y estado. */
export function FiltrosMarcasBar({
  nombre,
  onNombreChange,
  estado,
  onEstadoChange,
}: FiltrosMarcasBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        size="sm"
        type="search"
        placeholder="Buscar por código o nombre"
        aria-label="Buscar marcas"
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
    </div>
  )
}
