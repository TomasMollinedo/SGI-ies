import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import { OPCIONES_ATENDIDA } from '../config/alertas.config'
import { useTiposAlerta } from '../hooks/useAlertas'

interface FiltrosAlertasBarProps {
  tipoAlertaId: string
  onTipoAlertaIdChange: (valor: string) => void
  atendida: string
  onAtendidaChange: (valor: string) => void
  fechaDesde: string
  onFechaDesdeChange: (valor: string) => void
  fechaHasta: string
  onFechaHastaChange: (valor: string) => void
}

/** Barra de filtros del listado de alertas: tipo, estado y rango de fechas de creación. */
export function FiltrosAlertasBar({
  tipoAlertaId,
  onTipoAlertaIdChange,
  atendida,
  onAtendidaChange,
  fechaDesde,
  onFechaDesdeChange,
  fechaHasta,
  onFechaHastaChange,
}: FiltrosAlertasBarProps) {
  const { data: tipos } = useTiposAlerta()

  const opcionesTipo: SelectOption[] = [
    { value: '', label: 'Todos los tipos' },
    ...(tipos?.map((tipo) => ({
      value: String(tipo.id_tipo_alerta),
      label: tipo.nombre,
    })) ?? []),
  ]

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        size="sm"
        options={opcionesTipo}
        value={tipoAlertaId}
        onChange={(evento) => onTipoAlertaIdChange(evento.target.value)}
        className="w-50"
      />
      <Select
        size="sm"
        options={OPCIONES_ATENDIDA}
        value={atendida}
        onChange={(evento) => onAtendidaChange(evento.target.value)}
        className="w-50"
      />
      <Input
        type="date"
        size="sm"
        aria-label="Desde"
        value={fechaDesde}
        onChange={(evento) => onFechaDesdeChange(evento.target.value)}
        className="w-44"
      />
      <Input
        type="date"
        size="sm"
        aria-label="Hasta"
        value={fechaHasta}
        onChange={(evento) => onFechaHastaChange(evento.target.value)}
        className="w-44"
      />
    </div>
  )
}
