import { FilterX, Search } from 'lucide-react'
import { ProyectoCombobox } from '@/features/comercializacion/publicaciones/components/ProyectoCombobox'
import { FiltroClienteVenta } from '@/features/comercializacion/ventas/components/FiltroClienteVenta'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { OPCIONES_ESTADO } from '../config/consulta.config'
import type { FiltroEstadoConsulta } from '../types/consulta.types'

interface FiltrosConsultasBarProps {
  proyecto: string
  onProyectoChange: (valor: string) => void
  identificador: string
  onIdentificadorChange: (valor: string) => void
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
 * Filtros de la cola de consultas (HU-26): proyecto, identificador de
 * unidad, cliente, estado y período.
 *
 * `proyecto` e `identificador` son independientes entre sí — no es un combo
 * en cascada. El identificador busca por coincidencia parcial (ej. "3A")
 * sin importar el proyecto: como el identificador solo es único DENTRO de
 * su proyecto (dos obras distintas pueden tener cada una una unidad "3A"),
 * buscar sin combinar con "Proyecto" puede traer resultados de más de una
 * obra — es el comportamiento pedido, no hace falta un combo en cascada ni
 * un endpoint nuevo de búsqueda de unidades.
 *
 * El filtro de cliente reusa `FiltroClienteVenta` (mismo `ClienteCombobox`
 * con búsqueda server-side que ya usa el listado de Ventas).
 */
export function FiltrosConsultasBar({
  proyecto,
  onProyectoChange,
  identificador,
  onIdentificadorChange,
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
      <ProyectoCombobox value={proyecto} onChange={onProyectoChange} className="w-full sm:w-60" />

      <Input
        size="sm"
        type="search"
        label="Identificador de unidad"
        placeholder="Ej. 3A"
        iconLeft={<Search />}
        value={identificador}
        onChange={(evento) => onIdentificadorChange(evento.target.value)}
        className="w-full sm:w-44"
      />

      <FiltroClienteVenta value={cliente} onChange={onClienteChange} />

      <Select
        size="sm"
        label="Estado"
        options={OPCIONES_ESTADO}
        value={estado}
        onChange={(evento) => onEstadoChange(evento.target.value as FiltroEstadoConsulta)}
        className="w-full sm:w-45"
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
