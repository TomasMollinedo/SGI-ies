import { Search } from 'lucide-react'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'

interface FiltrosUnidadesMedidaBarProps {
  nombre: string
  onNombreChange: (valor: string) => void
  estado: string
  onEstadoChange: (valor: string) => void
}

const OPCIONES_ESTADO: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Dados de baja' },
]

export function FiltrosUnidadesMedidaBar({
  nombre,
  onNombreChange,
  estado,
  onEstadoChange,
}: FiltrosUnidadesMedidaBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        size="sm"
        placeholder="Buscar por nombre"
        iconLeft={<Search />}
        value={nombre}
        onChange={(e) => onNombreChange(e.target.value)}
        className="w-64"
      />
      <Select
        size="sm"
        options={OPCIONES_ESTADO}
        value={estado}
        onChange={(e) => onEstadoChange(e.target.value)}
        className="w-50"
      />
    </div>
  )
}
