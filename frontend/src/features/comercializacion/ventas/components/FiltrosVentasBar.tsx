import type { ReactNode } from 'react'
import { FilterX } from 'lucide-react'
import { ProyectoCombobox } from '@/features/comercializacion/publicaciones/components/ProyectoCombobox'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { esFiltroEstadoVenta, OPCIONES_ESTADO_VENTA } from '../config/venta.config'
import type { FiltroEstadoVenta } from '../config/venta.config'
import { FiltroClienteVenta } from './FiltroClienteVenta'
import { UnidadFuncionalSelect } from './UnidadFuncionalSelect'

interface FiltrosVentasBarProps {
  estado: FiltroEstadoVenta
  onEstadoChange: (valor: FiltroEstadoVenta) => void
  proyecto: string
  onProyectoChange: (valor: string) => void
  unidad: string
  onUnidadChange: (valor: string) => void
  cliente: string
  onClienteChange: (valor: string) => void
  fechaDesde: string
  onFechaDesdeChange: (valor: string) => void
  fechaHasta: string
  onFechaHastaChange: (valor: string) => void
  /** Mensaje del rango de fechas inválido. Se pinta sobre "Fecha hasta". */
  errorRango?: string
  onLimpiar: () => void
  hayFiltros: boolean
  /** Acciones de la pantalla (el botón de alta), alineadas a la derecha. */
  acciones?: ReactNode
}

/**
 * Barra de filtros del listado de ventas (HU-27): proyecto, unidad, cliente,
 * estado y período — los cuatro que pide el PB más el estado que ya existía.
 * Unidad queda deshabilitada hasta elegir proyecto (`UnidadFuncionalSelect`),
 * porque `GET /unidades-funcionales` no tiene búsqueda por texto.
 */
export function FiltrosVentasBar({
  estado,
  onEstadoChange,
  proyecto,
  onProyectoChange,
  unidad,
  onUnidadChange,
  cliente,
  onClienteChange,
  fechaDesde,
  onFechaDesdeChange,
  fechaHasta,
  onFechaHastaChange,
  errorRango,
  onLimpiar,
  hayFiltros,
  acciones,
}: FiltrosVentasBarProps) {
  return (
    <div className="flex w-full flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 flex-wrap items-end gap-3">
        <ProyectoCombobox
          value={proyecto}
          onChange={(valor) => {
            onProyectoChange(valor)
            onUnidadChange('')
          }}
          className="w-full sm:w-60"
        />

        <UnidadFuncionalSelect
          proyecto={proyecto}
          value={unidad}
          onChange={onUnidadChange}
          className="w-full sm:w-44"
        />

        <FiltroClienteVenta value={cliente} onChange={onClienteChange} />

        <Select
          size="sm"
          label="Estado"
          options={OPCIONES_ESTADO_VENTA}
          value={estado}
          onChange={(evento) => {
            const valor = evento.target.value
            if (esFiltroEstadoVenta(valor)) onEstadoChange(valor)
          }}
          className="w-full sm:w-40"
        />

        {/* El `<input type="date">` nativo ya trae el calendario del navegador y devuelve el valor en ISO (YYYY-MM-DD). */}
        <Input
          size="sm"
          type="date"
          label="Fecha desde"
          value={fechaDesde}
          onChange={(evento) => onFechaDesdeChange(evento.target.value)}
          className="w-40"
        />
        <Input
          size="sm"
          type="date"
          label="Fecha hasta"
          value={fechaHasta}
          onChange={(evento) => onFechaHastaChange(evento.target.value)}
          error={errorRango}
          className="w-40"
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

      {acciones}
    </div>
  )
}
