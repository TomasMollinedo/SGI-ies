import { Search } from 'lucide-react'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import { OPCIONES_ESTADO } from '../config/proveedor.config'
import { useCondicionesIva } from '../hooks/useProveedores'
import type { FiltroEstado } from '../types/proveedor.types'

interface FiltrosProveedoresBarProps {
  busqueda: string
  onBusquedaChange: (valor: string) => void
  /** `id` del catálogo de condiciones frente al IVA, o `''` para "todas". */
  condicionIva: string
  onCondicionIvaChange: (valor: string) => void
  estado: FiltroEstado
  onEstadoChange: (valor: FiltroEstado) => void
}

/** Barra de filtros del listado de proveedores: búsqueda, condición frente al IVA y estado. */
export function FiltrosProveedoresBar({
  busqueda,
  onBusquedaChange,
  condicionIva,
  onCondicionIvaChange,
  estado,
  onEstadoChange,
}: FiltrosProveedoresBarProps) {
  const { data: condicionesIva } = useCondicionesIva()

  const opcionesCondicionIva: SelectOption[] = [
    { value: '', label: 'Todas las condiciones' },
    ...(condicionesIva?.map((item) => ({ value: item.id, label: item.code })) ?? []),
  ]

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        size="sm"
        type="search"
        placeholder="Buscar por razón social o CUIT"
        aria-label="Buscar proveedores"
        iconLeft={<Search />}
        value={busqueda}
        onChange={(evento) => onBusquedaChange(evento.target.value)}
        // Más ancho que el resto de los buscadores: "Buscar por razón social o
        // CUIT" no entra en w-64 y el placeholder queda cortado.
        className="w-68"
      />
      <Select
        size="sm"
        options={opcionesCondicionIva}
        aria-label="Filtrar por condición frente al IVA"
        value={condicionIva}
        onChange={(evento) => onCondicionIvaChange(evento.target.value)}
        className="w-52"
      />
      <Select
        size="sm"
        options={OPCIONES_ESTADO}
        aria-label="Filtrar por estado"
        value={estado}
        onChange={(evento) => onEstadoChange(evento.target.value as FiltroEstado)}
        className="w-40"
      />
    </div>
  )
}
