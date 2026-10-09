import { RotateCcw } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { OPCIONES_AGRUPACION } from '../config/tablero.config'
import type { Agrupacion } from '../types/tablero.types'

interface FiltrosTableroBarProps {
  agrupacion: Agrupacion
  onAgrupacionChange: (valor: Agrupacion) => void
  fechaDesde: string
  onFechaDesdeChange: (valor: string) => void
  fechaHasta: string
  onFechaHastaChange: (valor: string) => void
  /** Mensaje del rango inválido. Se pinta sobre "Fecha hasta". */
  errorRango?: string
  onRestablecer: () => void
  /** `false` cuando los filtros ya son los de origen (año en curso, mensual). */
  hayCambios: boolean
}

/**
 * Agrupación de los períodos y rango de fechas del tablero. Las dos fechas son
 * obligatorias y van siempre juntas: el backend las exige de a par.
 */
export function FiltrosTableroBar({
  agrupacion,
  onAgrupacionChange,
  fechaDesde,
  onFechaDesdeChange,
  fechaHasta,
  onFechaHastaChange,
  errorRango,
  onRestablecer,
  hayCambios,
}: FiltrosTableroBarProps) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <Select
        size="sm"
        label="Agrupar por"
        options={OPCIONES_AGRUPACION}
        value={agrupacion}
        onChange={(evento) => onAgrupacionChange(evento.target.value as Agrupacion)}
        className="w-40"
      />

      <Input
        size="sm"
        type="date"
        label="Fecha desde"
        value={fechaDesde}
        onChange={(evento) => onFechaDesdeChange(evento.target.value)}
        error={fechaDesde === '' ? 'Obligatoria' : undefined}
        className="w-44"
      />

      <Input
        size="sm"
        type="date"
        label="Fecha hasta"
        value={fechaHasta}
        onChange={(evento) => onFechaHastaChange(evento.target.value)}
        error={fechaHasta === '' ? 'Obligatoria' : errorRango}
        className="w-44"
      />

      {/* Alineado con los campos (que tienen un label arriba): `mt-5` ≈ alto del label + gap. */}
      <Button
        size="sm"
        icon={<RotateCcw />}
        onClick={onRestablecer}
        disabled={!hayCambios}
        title="Volver al año en curso agrupado por mes"
        className="mt-5"
      >
        Restablecer
      </Button>
    </div>
  )
}
