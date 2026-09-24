import { FilterX } from 'lucide-react'
import { FiltroClienteVenta } from '@/features/comercializacion/ventas/components/FiltroClienteVenta'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { OPCIONES_ESTADO } from '../config/consulta.config'
import type { FiltroEstadoConsulta } from '../types/consulta.types'

interface FiltrosConsultasBarProps {
  unidad: string
  onUnidadChange: (valor: string) => void
  cliente: string
  onClienteChange: (valor: string) => void
  estado: FiltroEstadoConsulta
  onEstadoChange: (valor: FiltroEstadoConsulta) => void
  fechaDesde: string
  onFechaDesdeChange: (valor: string) => void
  fechaHasta: string
  onFechaHastaChange: (valor: string) => void
  /** Mensaje del rango de fechas inválido. Se pinta sobre "Fecha hasta". */
  errorRango?: string
  onLimpiar: () => void
  hayFiltros: boolean
}

/**
 * Filtros de la cola de consultas (HU-26): unidad, cliente, estado y período.
 *
 * El filtro de unidad es el `id_unidad_funcional` a mano, con un `<input
 * type="number">`: hoy no existe un endpoint que busque unidades por
 * identificador de texto libre (el `SelectorUnidadModal` de Publicaciones
 * filtra "publicables", no cualquier unidad — no sirve para este caso, que
 * necesita encontrar cualquiera, incluso despublicada). Se puede cambiar por
 * un combo de búsqueda el día que ese endpoint exista.
 *
 * El filtro de cliente reusa `FiltroClienteVenta` (mismo `ClienteCombobox`
 * con búsqueda server-side que ya usa el listado de Ventas).
 */
export function FiltrosConsultasBar({
  unidad,
  onUnidadChange,
  cliente,
  onClienteChange,
  estado,
  onEstadoChange,
  fechaDesde,
  onFechaDesdeChange,
  fechaHasta,
  onFechaHastaChange,
  errorRango,
  onLimpiar,
  hayFiltros,
}: FiltrosConsultasBarProps) {
  return (
    <div className="flex w-full flex-wrap items-end gap-3">
      <Input
        size="sm"
        type="number"
        min={1}
        label="ID de unidad"
        placeholder="Ej. 42"
        value={unidad}
        onChange={(evento) => onUnidadChange(evento.target.value)}
        className="w-full sm:w-32"
      />

      <FiltroClienteVenta value={cliente} onChange={onClienteChange} />

      <Select
        size="sm"
        label="Estado"
        options={OPCIONES_ESTADO}
        value={estado}
        onChange={(evento) => onEstadoChange(evento.target.value as FiltroEstadoConsulta)}
        className="w-full sm:w-40"
      />

      {/* `<input type="date">` nativo: trae el calendario del navegador y devuelve el valor en ISO (YYYY-MM-DD). */}
      <Input
        size="sm"
        type="date"
        label="Fecha desde"
        value={fechaDesde}
        onChange={(evento) => onFechaDesdeChange(evento.target.value)}
        className="w-full sm:w-40"
      />
      <Input
        size="sm"
        type="date"
        label="Fecha hasta"
        value={fechaHasta}
        onChange={(evento) => onFechaHastaChange(evento.target.value)}
        error={errorRango}
        className="w-full sm:w-40"
      />

      <Button
        size="sm"
        icon={<FilterX />}
        onClick={onLimpiar}
        disabled={!hayFiltros}
        title="Volver a los filtros por defecto"
      >
        Limpiar filtros
      </Button>
    </div>
  )
}
