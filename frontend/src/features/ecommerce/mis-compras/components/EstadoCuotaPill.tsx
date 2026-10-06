import { cn } from '@/shared/utils/cn'
import type { EstadoCuota } from '../types/miVenta.types'

const ESTADO_LABEL: Record<EstadoCuota, string> = {
  PENDIENTE: 'Pendiente',
  PARCIAL: 'Parcial',
  PAGADA: 'Pagada',
  ANULADA: 'Anulada',
}

// Mismo recurso que la alerta de "cuotas vencidas" de `TarjetaMiCompra"
// (border-X + bg-X/25 + text-X-soft): son los únicos tokens de estado
// pensados para leerse bien sobre el fondo oscuro del sitio público. `Badge`
// (shared/ui) no sirve acá porque está calibrado para fondo claro.
const ESTADO_CLASES: Record<EstadoCuota, string> = {
  PENDIENTE: 'border-light/30 text-light/70',
  PARCIAL: 'border-warning bg-warning/25 text-warning-soft',
  PAGADA: 'border-success bg-success/25 text-success-soft',
  ANULADA: 'border-light/15 text-light/40 line-through',
}

interface EstadoCuotaPillProps {
  estado: EstadoCuota
}

/** Pastilla de estado de una cuota. */
export function EstadoCuotaPill({ estado }: EstadoCuotaPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap',
        ESTADO_CLASES[estado]
      )}
    >
      {ESTADO_LABEL[estado]}
    </span>
  )
}
