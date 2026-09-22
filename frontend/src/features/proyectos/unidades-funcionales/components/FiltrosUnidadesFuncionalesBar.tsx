import { ProyectoCombobox } from '@/features/comercializacion/publicaciones/components/ProyectoCombobox'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import { OPCIONES_ESTADO } from '../config/unidadFuncional.config'
import { useTipologias } from '../hooks/useUnidadesFuncionales'
import type { FiltroEstado } from '../types/unidadFuncional.types'

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
 * Filtros combinables del listado: proyecto (mismo `ProyectoCombobox` con
 * búsqueda que usa el listado de Publicaciones — para elegir proyecto acá
 * alcanza esto, la tabla emergente es solo para el formulario de alta),
 * tipología, rango de superficie cubierta y estado.
 *
 * Cada campo lleva su `label` arriba (en vez de apoyarse solo en el
 * placeholder): con anchos angostos, un placeholder largo se corta, pero un
 * label puede pasar a una segunda línea sin perder texto.
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
  const { data: tipologias } = useTipologias()

  const opcionesTipologia: SelectOption[] = [
    { value: '', label: 'Todas las tipologías' },
    ...(tipologias?.map((item) => ({ value: item.id, label: item.code })) ?? []),
  ]

  return (
    <div className="flex w-full flex-wrap items-end gap-3">
      <ProyectoCombobox value={proyectoId} onChange={onProyectoIdChange} className="w-full sm:w-64" />

      <Select
        size="sm"
        label="Tipología"
        options={opcionesTipologia}
        value={tipologia}
        onChange={(evento) => onTipologiaChange(evento.target.value)}
        className="w-full sm:w-56"
      />

      <Input
        size="sm"
        type="number"
        min={0}
        step="0.01"
        label="Superficie mínima (m²)"
        placeholder="Ej. 40"
        value={superficieMin}
        onChange={(evento) => onSuperficieMinChange(evento.target.value)}
        className="w-full sm:w-44"
      />

      <Input
        size="sm"
        type="number"
        min={0}
        step="0.01"
        label="Superficie máxima (m²)"
        placeholder="Ej. 120"
        value={superficieMax}
        onChange={(evento) => onSuperficieMaxChange(evento.target.value)}
        className="w-full sm:w-44"
      />

      <Select
        size="sm"
        label="Estado"
        options={OPCIONES_ESTADO}
        value={estado}
        onChange={(evento) => onEstadoChange(evento.target.value as FiltroEstado)}
        className="w-full sm:w-36"
      />
    </div>
  )
}
