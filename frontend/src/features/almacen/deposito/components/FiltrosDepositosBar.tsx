import { Search } from 'lucide-react'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'

interface FiltrosDepositosBarProps {
  nombre: string
  onNombreChange: (valor: string) => void
  estado: string
  onEstadoChange: (valor: string) => void
  esObrador: string
  onEsObradorChange: (valor: string) => void
}

const OPCIONES_ESTADO: SelectOption[] = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Dados de baja' },
]

const OPCIONES_ES_OBRADOR: SelectOption[] = [
  { value: '', label: 'Todos' },
  { value: 'false', label: 'Depósito' },
  { value: 'true', label: 'Obrador' },
]

/** Barra de filtros del listado de depósitos/obradores: nombre, estado y tipo. */
export function FiltrosDepositosBar({
  nombre,
  onNombreChange,
  estado,
  onEstadoChange,
  esObrador,
  onEsObradorChange,
}: FiltrosDepositosBarProps) {
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
        className="w-40"
      />
      <Select
        size="sm"
        options={OPCIONES_ES_OBRADOR}
        value={esObrador}
        onChange={(evento) => onEsObradorChange(evento.target.value)}
        className="w-40"
      />
    </div>
  )
}
