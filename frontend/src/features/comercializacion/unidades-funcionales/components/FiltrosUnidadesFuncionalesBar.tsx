
import { useState } from 'react'
import { useProyectos } from '@/features/proyectos/hooks/useProyectos'
import { Combobox } from '@/shared/components/ui/Combobox'
import type { ComboboxOption } from '@/shared/components/ui/Combobox'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { OPCIONES_ESTADO } from '../config/unidadFuncional.config'
import { useTipologias } from '../hooks/useUnidadesFuncionales'
import type { FiltroEstado } from '../types/unidadFuncional.types'

const DEBOUNCE_BUSQUEDA = 400

interface FiltrosUnidadesFuncionalesBarProps {
  proyectoId: string
  onProyectoIdChange: (value: string) => void
  tipologia: string
  onTipologiaChange: (value: string) => void
  superficieMin: string
  onSuperficieMinChange: (value: string) => void
  superficieMax: string
  onSuperficieMaxChange: (value: string) => void
  estado: FiltroEstado
  onEstadoChange: (value: FiltroEstado) => void
}

/**
 * Filtros combinables del listado: proyecto (combo con búsqueda — para elegir
 * proyecto alcanza esto, la tabla emergente es solo para el formulario),
 * tipología, rango de superficie cubierta y estado.
 */
export function FiltrosUnidadesFuncionalesBar({
  proyectoId,
  onProyectoIdChange,
  tipologia,
  onTipologiaChange,
  superficieMin,
  onSuperficieMinChange,
  superficieMax,
  onSuperficieMaxChange,
  estado,
  onEstadoChange,
}: FiltrosUnidadesFuncionalesBarProps) {
  const [busquedaProyecto, setBusquedaProyecto] = useState('')
  const busquedaDebounced = useDebounce(busquedaProyecto.trim(), DEBOUNCE_BUSQUEDA)

  const { data: proyectos, isFetching: cargandoProyectos } = useProyectos({
    busqueda: busquedaDebounced || undefined,
    limit: 20,
  })
  const { data: tipologias } = useTipologias()

  const opcionesProyecto: ComboboxOption[] = (proyectos?.data ?? []).map((proyecto) => ({
    value: String(proyecto.id_proyecto),
    label: `${proyecto.codigo} — ${proyecto.nombre}`,
  }))

  const opcionesTipologia: SelectOption[] = [
    { value: '', label: 'Todas las tipologías' },
    ...(tipologias?.map((item) => ({ value: item.id, label: item.code })) ?? []),
  ]

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Combobox
        size="sm"
        placeholder="Todos los proyectos"
        minChars={0}
        value={proyectoId}
        onChange={onProyectoIdChange}
        options={opcionesProyecto}
        onSearch={setBusquedaProyecto}
        loading={cargandoProyectos}
        className="w-64"
      />

      <Select
        size="sm"
        aria-label="Tipología"
        options={opcionesTipologia}
        value={tipologia}
        onChange={(evento) => onTipologiaChange(evento.target.value)}
        className="w-56"
      />

      <Input
        size="sm"
        type="number"
        min={0}
        step="0.01"
        placeholder="Superficie mín. (m²)"
        aria-label="Superficie cubierta mínima"
        value={superficieMin}
        onChange={(evento) => onSuperficieMinChange(evento.target.value)}
        className="w-40"
      />

      <Input
        size="sm"
        type="number"
        min={0}
        step="0.01"
        placeholder="Superficie máx. (m²)"
        aria-label="Superficie cubierta máxima"
        value={superficieMax}
        onChange={(evento) => onSuperficieMaxChange(evento.target.value)}
        className="w-40"
      />

      <Select
        size="sm"
        aria-label="Estado"
        options={OPCIONES_ESTADO}
        value={estado}
        onChange={(evento) => onEstadoChange(evento.target.value as FiltroEstado)}
        className="w-36"
      />
    </div>
  )
}
