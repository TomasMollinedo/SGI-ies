import { FilterX } from 'lucide-react'
import type { SelectOption } from '@/shared/components/ui/Select'
import { Button } from '@/shared/components/ui/Button'
import { Select } from '@/shared/components/ui/Select'
import { OPCIONES_TIPOLOGIA } from '@/shared/config/tipologiaUnidad.config'
import { cn } from '@/shared/utils/cn'
import type { FiltrosCatalogo } from '@/features/ecommerce/types/catalogoPublico.types'
import { FILTROS, OPCIONES_ENTREGA } from '../config/catalogo.config'

interface ControlesFiltrosProps {
  filtros: FiltrosCatalogo
  opcionesProyecto: SelectOption[]
  hayFiltros: boolean
  onProyecto: (valor: string) => void
  onTipologia: (valor: string) => void
  onEntrega: (valor: string) => void
  onLimpiar: () => void
  className?: string
}

/**
 * Los tres filtros del catálogo. Los usa tal cual la barra de escritorio y el
 * panel de pantallas angostas, para que no haya dos versiones que se
 * desincronicen.
 *
 * `Select` es el del panel interno y trae el label con los colores del fondo
 * claro; acá se lo reescribe una sola vez para todo el bloque, en vez de tocar
 * el componente compartido. El control en sí queda igual que en el resto del
 * sistema.
 */
export function ControlesFiltros({
  filtros,
  opcionesProyecto,
  hayFiltros,
  onProyecto,
  onTipologia,
  onEntrega,
  onLimpiar,
  className,
}: ControlesFiltrosProps) {
  const entrega = filtros.entregada === undefined ? '' : String(filtros.entregada)

  return (
    <div
      className={cn('[&_label]:text-light flex flex-col gap-4 lg:flex-row lg:items-end', className)}
    >
      <Select
        label={FILTROS.proyecto}
        options={opcionesProyecto}
        value={filtros.FK_proyecto === undefined ? '' : String(filtros.FK_proyecto)}
        onChange={(evento) => onProyecto(evento.target.value)}
        className="lg:max-w-56"
      />

      <Select
        label={FILTROS.tipologia}
        options={OPCIONES_TIPOLOGIA}
        value={filtros.tipologia ?? ''}
        onChange={(evento) => onTipologia(evento.target.value)}
        className="lg:max-w-56"
      />

      <Select
        label={FILTROS.entrega}
        options={OPCIONES_ENTREGA}
        value={entrega}
        onChange={(evento) => onEntrega(evento.target.value)}
        className="lg:max-w-48"
      />

      <Button
        variant="primary"
        icon={<FilterX />}
        onClick={onLimpiar}
        disabled={!hayFiltros}
        className="shrink-0"
      >
        {FILTROS.limpiar}
      </Button>
    </div>
  )
}
