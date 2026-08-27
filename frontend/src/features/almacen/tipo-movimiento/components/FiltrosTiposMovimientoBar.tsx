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

/**
 * Sin la opción "Todos" a propósito: el backend, cuando no recibe `estado`,
 * devuelve solo los activos. Un "Todos" que omitiera el parámetro mostraría lo
 * mismo que "Activo" y engañaría al usuario.
 */
const OPCIONES_ESTADO: SelectOption[] = [
  { value: 'true', label: 'Activo' },
  { value: 'false', label: 'Inactivo' },
]

const OPCIONES_INDICADOR: SelectOption[] = [
  { value: '', label: 'Todos los signos' },
  { value: 'true', label: 'Entrada' },
  { value: 'false', label: 'Salida' },
]

/** Barra de filtros del listado de tipos de movimiento: nombre, estado y signo. */
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
        aria-label="Filtrar por signo"
        value={indicador}
        onChange={(evento) => onIndicadorChange(evento.target.value as FiltroIndicador)}
        className="w-50"
      />
    </div>
  )
}
