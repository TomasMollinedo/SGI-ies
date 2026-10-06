import { FilterX, Search } from 'lucide-react'
import { ProyectoCombobox } from '@/features/comercializacion/publicaciones/components/ProyectoCombobox'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { esFiltroBooleano, OPCIONES_COMPRAS, OPCIONES_MORA } from '../config/cliente.config'
import type { FiltroBooleano } from '../types/cliente.types'

interface FiltrosClientesBarProps {
  busqueda: string
  onBusquedaChange: (valor: string) => void
  compras: FiltroBooleano
  onComprasChange: (valor: FiltroBooleano) => void
  mora: FiltroBooleano
  onMoraChange: (valor: FiltroBooleano) => void
  proyecto: string
  onProyectoChange: (valor: string) => void
  onLimpiar: () => void
  hayFiltros: boolean
}

/**
 * Barra de filtros del listado de clientes (HU-33): búsqueda de texto, con o
 * sin compras, mora y proyecto. Es controlada por props — el estado vive en la
 * página, que es la que arma la query.
 *
 * No tiene filtro de orden: el backend ordena siempre por apellido y después
 * nombre, como lo pide la HU, y no acepta parámetros de ordenamiento.
 */
export function FiltrosClientesBar({
  busqueda,
  onBusquedaChange,
  compras,
  onComprasChange,
  mora,
  onMoraChange,
  proyecto,
  onProyectoChange,
  onLimpiar,
  hayFiltros,
}: FiltrosClientesBarProps) {
  return (
    <div className="flex w-full flex-wrap items-end gap-3">
      {/* Un solo campo para los cuatro datos: así lo resuelve el backend, que
          matchea cada palabra contra nombre, apellido, DNI/CUIL o correo. */}
      <Input
        size="sm"
        type="search"
        label="Buscar"
        placeholder="Nombre, apellido, DNI/CUIL o correo"
        iconLeft={<Search />}
        value={busqueda}
        onChange={(evento) => onBusquedaChange(evento.target.value)}
        className="w-full sm:w-72"
      />

      <Select
        size="sm"
        label="Compras"
        options={OPCIONES_COMPRAS}
        value={compras}
        onChange={(evento) => {
          const valor = evento.target.value
          if (esFiltroBooleano(valor)) onComprasChange(valor)
        }}
        className="w-full sm:w-48"
      />

      <Select
        size="sm"
        label="Mora"
        options={OPCIONES_MORA}
        value={mora}
        onChange={(evento) => {
          const valor = evento.target.value
          if (esFiltroBooleano(valor)) onMoraChange(valor)
        }}
        className="w-full sm:w-44"
      />

      <ProyectoCombobox value={proyecto} onChange={onProyectoChange} className="w-full sm:w-60" />

      <Button
        size="sm"
        icon={<FilterX />}
        onClick={onLimpiar}
        disabled={!hayFiltros}
        title="Quitar todos los filtros"
      >
        Limpiar filtros
      </Button>
    </div>
  )
}
