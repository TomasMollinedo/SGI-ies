import { Search } from 'lucide-react'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import type { FiltroEfectoSaldo, FiltroEstado } from '../types/tipoComprobante.types'

interface FiltrosTiposComprobanteBarProps {
  nombre: string
  onNombreChange: (valor: string) => void
  estado: FiltroEstado
  onEstadoChange: (valor: FiltroEstado) => void
  efectoSaldo: FiltroEfectoSaldo
  onEfectoSaldoChange: (valor: FiltroEfectoSaldo) => void
}

const OPCIONES_ESTADO: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
]

const OPCIONES_EFECTO_SALDO: SelectOption[] = [
  { value: '', label: 'Todos los efectos' },
  { value: 'true', label: 'Aumenta' },
  { value: 'false', label: 'Disminuye' },
]

/** Barra de filtros del listado de tipos de comprobante: nombre, estado y efecto sobre el saldo. */
export function FiltrosTiposComprobanteBar({
  nombre,
  onNombreChange,
  estado,
  onEstadoChange,
  efectoSaldo,
  onEfectoSaldoChange,
}: FiltrosTiposComprobanteBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        size="sm"
        type="search"
        placeholder="Buscar por nombre"
        aria-label="Buscar tipos de comprobante"
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
        options={OPCIONES_EFECTO_SALDO}
        aria-label="Filtrar por efecto sobre el saldo"
        value={efectoSaldo}
        onChange={(evento) => onEfectoSaldoChange(evento.target.value as FiltroEfectoSaldo)}
        className="w-60"
      />
    </div>
  )
}
