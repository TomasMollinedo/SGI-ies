import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import { OPCIONES_ESTADO, OPCIONES_ESTADO_OBRA } from '../config/proyecto.config'
import { useLocalidadesProyecto } from '../hooks/useProyectos'
import type { FiltroEstadoProyecto } from '../types/proyecto.types'

interface FiltrosProyectosBarProps {
  busqueda: string
  onBusquedaChange: (valor: string) => void
  /** Estado de obra, o `''` para todos. */
  estadoObra: string
  onEstadoObraChange: (valor: string) => void
  /** Localidad, o `''` para todas. */
  localidad: string
  onLocalidadChange: (valor: string) => void
  estado: FiltroEstadoProyecto
  onEstadoChange: (valor: FiltroEstadoProyecto) => void
  /** Acciones de la pantalla (el botón de alta), alineadas a la derecha. */
  acciones?: ReactNode
}

/**
 * Filtros combinables del listado de proyectos: búsqueda por código o nombre,
 * estado de obra, localidad y activos / dados de baja.
 *
 * Las localidades no son una lista fija: salen de las ya cargadas en los
 * proyectos ACTIVOS (OBS-23). Por eso, con el filtro en "Dados de baja" o
 * "Todos", puede faltar una localidad que solo tenga proyectos dados de baja.
 */
export function FiltrosProyectosBar({
  busqueda,
  onBusquedaChange,
  estadoObra,
  onEstadoObraChange,
  localidad,
  onLocalidadChange,
  estado,
  onEstadoChange,
  acciones,
}: FiltrosProyectosBarProps) {
  const { data: localidades } = useLocalidadesProyecto()

  const opcionesLocalidad: SelectOption[] = [
    { value: '', label: 'Todas las localidades' },
    ...(localidades?.map((item) => ({ value: item.id, label: item.code })) ?? []),
  ]
  // La localidad elegida puede dejar de venir en el catálogo (ej. se dio de
  // baja su último proyecto activo): se conserva como opción para que el
  // `<select>` siga mostrando qué filtro está aplicado.
  if (localidad && !opcionesLocalidad.some((opcion) => opcion.value === localidad)) {
    opcionesLocalidad.push({ value: localidad, label: localidad })
  }

  return (
    <div className="flex w-full flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 flex-wrap items-end gap-3">
        <Input
          size="sm"
          type="search"
          label="Buscar por código o nombre"
          placeholder="Ej. Torre Nogal"
          iconLeft={<Search />}
          value={busqueda}
          onChange={(evento) => onBusquedaChange(evento.target.value)}
          className="w-full sm:w-64"
        />

        <Select
          size="sm"
          label="Estado de obra"
          options={OPCIONES_ESTADO_OBRA}
          value={estadoObra}
          onChange={(evento) => onEstadoObraChange(evento.target.value)}
          className="w-full sm:w-48"
        />

        <Select
          size="sm"
          label="Localidad"
          options={opcionesLocalidad}
          value={localidad}
          onChange={(evento) => onLocalidadChange(evento.target.value)}
          className="w-full sm:w-56"
        />

        <Select
          size="sm"
          label="Estado"
          options={OPCIONES_ESTADO}
          value={estado}
          onChange={(evento) => onEstadoChange(evento.target.value as FiltroEstadoProyecto)}
          className="w-full sm:w-40"
        />
      </div>

      {acciones}
    </div>
  )
}
