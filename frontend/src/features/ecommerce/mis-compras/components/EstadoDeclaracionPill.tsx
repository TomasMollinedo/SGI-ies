import { cn } from '@/shared/utils/cn'
import { ESTADO_DECLARACION_LABEL } from '../config/misCompras.config'
import type { EstadoDeclaracionPago } from '../types/declaracionPago.types'

// Mismo recurso que `EstadoCuotaPill` (border-X + bg-X/25 + text-X-soft): son
// los tokens de estado pensados para leerse bien sobre el fondo oscuro del
// sitio público.
const ESTADO_CLASES: Record<EstadoDeclaracionPago, string> = {
  PENDIENTE: 'border-warning bg-warning/25 text-warning-soft',
  VALIDADA: 'border-success bg-success/25 text-success-soft',
  RECHAZADA: 'border-error bg-error/25 text-error-soft',
}

interface EstadoDeclaracionPillProps {
  estado: EstadoDeclaracionPago
}

/** Pastilla de estado de una declaración de pago. */
export function EstadoDeclaracionPill({ estado }: EstadoDeclaracionPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap',
        ESTADO_CLASES[estado]
      )}
    >
      {ESTADO_DECLARACION_LABEL[estado]}
    </span>
  )
}
