import { FilterX } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { OPCIONES_CLASE } from '../config/cardexCuentaCorriente.config'

interface FiltrosCardexCuentaCorrienteBarProps {
  fechaDesde: string
  onFechaDesdeChange: (valor: string) => void
  fechaHasta: string
  onFechaHastaChange: (valor: string) => void
  /** Mensaje del rango de fechas inválido. Se pinta sobre "Fecha hasta". */
  errorRango?: string
  clase: string
  onClaseChange: (valor: string) => void
  onLimpiar: () => void
  hayFiltros: boolean
}

/**
 * Filtros del extracto: período y clase de movimiento. El proveedor ya viene
 * fijado por la fila desde la que se entró.
 *
 * Acotar el período no recalcula `saldo_acumulado` —siempre refleja el saldo
 * real—, así que el extracto filtrado puede arrancar en un saldo distinto de
 * cero: con `fechaDesde` el backend agrega la fila sintética de apertura.
 */
export function FiltrosCardexCuentaCorrienteBar({
  fechaDesde,
  onFechaDesdeChange,
  fechaHasta,
  onFechaHastaChange,
  errorRango,
  clase,
  onClaseChange,
  onLimpiar,
  hayFiltros,
}: FiltrosCardexCuentaCorrienteBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* El `<input type="date">` nativo ya trae el calendario del navegador y
          devuelve el valor en ISO (YYYY-MM-DD), que es lo que espera la query. */}
      <Input
        size="sm"
        type="date"
        label="Fecha desde"
        value={fechaDesde}
        onChange={(evento) => onFechaDesdeChange(evento.target.value)}
        className="w-44"
      />
      <Input
        size="sm"
        type="date"
        label="Fecha hasta"
        value={fechaHasta}
        onChange={(evento) => onFechaHastaChange(evento.target.value)}
        error={errorRango}
        className="w-44"
      />
      <Select
        size="sm"
        label="Clase"
        options={OPCIONES_CLASE}
        value={clase}
        onChange={(evento) => onClaseChange(evento.target.value)}
        className="w-52"
      />
      <Button
        size="sm"
        icon={<FilterX />}
        onClick={onLimpiar}
        disabled={!hayFiltros}
        title="Quitar todos los filtros aplicados"
      >
        Limpiar filtros
      </Button>
    </div>
  )
}
