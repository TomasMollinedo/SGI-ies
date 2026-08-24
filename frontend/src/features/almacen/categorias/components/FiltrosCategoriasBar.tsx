import { Search } from 'lucide-react'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'

interface FiltrosCategoriasBarProps {
  nombre: string
  onNombreChange: (valor: string) => void
  estado: string
  onEstadoChange: (valor: string) => void
}

const OPCIONES_ESTADO: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
]

/** Barra de filtros del listado de categorías: nombre y estado. */
export function FiltrosCategoriasBar({
  nombre,
  onNombreChange,
  estado,
  onEstadoChange,
}: FiltrosCategoriasBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        size="sm"
        placeholder="Buscar por nombre"
        iconLeft={<Search />}
        value={nombre}
        onChange={(evento) => onNombreChange(evento.target.value)}
        className="w-64"
      />
      <Select
        size="sm"
        options={OPCIONES_ESTADO}
        value={estado}
        onChange={(evento) => onEstadoChange(evento.target.value)}
        className="w-50"
      />
    </div>
  )
}
