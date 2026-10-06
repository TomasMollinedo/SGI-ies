import { AlertTriangle, Info, Receipt } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { formatearFechaSinHora } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import { cn } from '@/shared/utils/cn'
import { CRONOGRAMA } from '../config/misCompras.config'
import type { CuotaMiVenta } from '../types/miVenta.types'
import { etiquetaCuota } from '../utils/cuotaDeclarable'
import { EstadoCuotaPill } from './EstadoCuotaPill'

interface TablaCuotasProps {
  cuotas: CuotaMiVenta[]
  /** Si la cuota admite declarar un pago (ver `puedeDeclararCuota`). */
  puedeDeclarar: (cuota: CuotaMiVenta) => boolean
  onDeclarar: (cuota: CuotaMiVenta) => void
  /**
   * Si se ofrece declarar pagos en este cronograma:
   * - `'contado'`: la venta es de contado, se paga presencialmente (regla de
   *   negocio). No se ofrece declarar y se avisa por qué.
   * - `'presencial'`: no hay ninguna forma de pago habilitada para
   *   autogestión. No se ofrece declarar y se avisa que el pago es presencial.
   * - `'desconocida'`: el catálogo de formas todavía carga (o falló). Tampoco
   *   se ofrece declarar, pero no se afirma nada.
   * Los avisos van una sola vez, arriba del cronograma.
   */
  declaracion: DisponibilidadDeclaracion
}

export type DisponibilidadDeclaracion = 'disponible' | 'contado' | 'presencial' | 'desconocida'

const AVISO_SIN_DECLARACION: Partial<Record<DisponibilidadDeclaracion, string>> = {
  contado: CRONOGRAMA.pagoContado,
  presencial: CRONOGRAMA.pagoPresencial,
}

/**
 * Cronograma completo de cuotas. Una cuota vencida se resalta con borde y
 * fondo tintados en rojo, más los días de atraso en texto — el cliente tiene
 * que darse cuenta sin leer fechas, no alcanza con la pastilla de estado.
 */
export function TablaCuotas({ cuotas, puedeDeclarar, onDeclarar, declaracion }: TablaCuotasProps) {
  const aviso = AVISO_SIN_DECLARACION[declaracion]

  return (
    <section aria-labelledby="titulo-cuotas" className="flex flex-col gap-6">
      <h2 id="titulo-cuotas" className="text-light text-titulo-modal font-bold">
        {CRONOGRAMA.titulo}
      </h2>

      {aviso && (
        <p className="border-light/15 text-light/70 flex gap-2 border p-4 text-sm">
          <Info size={16} aria-hidden="true" className="text-secondary mt-0.5 shrink-0" />
          {aviso}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {cuotas.map((cuota) => (
          <li key={cuota.id_cuota}>
            <FilaCuota
              cuota={cuota}
              onDeclarar={
                declaracion === 'disponible' && puedeDeclarar(cuota) ? onDeclarar : undefined
              }
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

interface FilaCuotaProps {
  cuota: CuotaMiVenta
  /** Sin handler, la cuota no ofrece declarar un pago. */
  onDeclarar?: (cuota: CuotaMiVenta) => void
}

function FilaCuota({ cuota, onDeclarar }: FilaCuotaProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6',
        cuota.vencido ? 'border-error bg-error/10' : 'border-light/15'
      )}
    >
      <div className="flex flex-col gap-1">
        <span className="text-light/60 font-mono text-xs tracking-widest uppercase">
          {etiquetaCuota(cuota.numero)}
        </span>
        <span className="text-light text-sm">
          Vence el {formatearFechaSinHora(cuota.fecha_vencimiento)}
        </span>
        {cuota.vencido && (
          <span className="text-error-soft flex items-center gap-1.5 text-xs font-semibold">
            <AlertTriangle size={14} aria-hidden="true" className="shrink-0" />
            Vencida hace {cuota.dias_vencido} {cuota.dias_vencido === 1 ? 'día' : 'días'}
          </span>
        )}
        {onDeclarar && (
          // `primary` (terracota sólido) es la variante que ya usa el sitio
          // público para sus botones: se distingue del fondo oscuro y también
          // del tinte rojo de una cuota vencida. El outline de foco por defecto
          // es oscuro y se pierde acá: se pasa a claro.
          <Button
            size="sm"
            variant="primary"
            icon={<Receipt />}
            onClick={() => onDeclarar(cuota)}
            className="focus-visible:outline-light mt-2 self-start"
          >
            {CRONOGRAMA.declararPago}
            <span className="sr-only"> — {etiquetaCuota(cuota.numero)}</span>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5">
        <EstadoCuotaPill estado={cuota.estado} />
        <span className="text-light text-sm font-semibold">
          {cuota.saldo_pendiente > 0 ? (
            <>
              <span className="text-light/60 font-normal">Saldo </span>
              {formatearImporte(cuota.saldo_pendiente)}
            </>
          ) : (
            formatearImporte(cuota.importe)
          )}
        </span>
      </div>
    </div>
  )
}
