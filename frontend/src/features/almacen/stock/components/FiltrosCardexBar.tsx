import { FilterX } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'

interface FiltrosCardexBarProps {
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
 * Filtro de período del cardex. Es el único filtro de la pantalla: el artículo
 * y el depósito ya vienen fijados por la ficha desde la que se entró.
 *
 * Acotar el período no recalcula los saldos de las líneas —cada una conserva el
 * que se registró al confirmar su movimiento—, así que el cardex filtrado puede
 * arrancar en un saldo distinto de cero. De eso avisa la ficha de arriba.
 */
export function FiltrosCardexBar({
  fechaDesde,
  onFechaDesdeChange,
  fechaHasta,
  onFechaHastaChange,
  errorRango,
  onLimpiar,
  hayFiltros,
}: FiltrosCardexBarProps) {
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
      <Button
        size="sm"
        icon={<FilterX />}
        onClick={onLimpiar}
        disabled={!hayFiltros}
        title="Quitar el filtro de período"
      >
        Limpiar filtros
      </Button>
    </div>
  )
}
