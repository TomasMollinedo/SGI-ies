import { AlertTriangle, Info, Receipt } from 'lucide-react'
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
   * `'presencial'` si no hay ninguna forma de pago habilitada para
   * autogestión: no se ofrece declarar en ninguna cuota y se avisa una sola
   * vez, arriba del cronograma, que el pago es presencial. Mientras el
   * catálogo carga (o si falló) es `'desconocida'`: tampoco se ofrece
   * declarar, pero no se afirma nada.
   */
  declaracion: DisponibilidadDeclaracion
}

export type DisponibilidadDeclaracion = 'disponible' | 'presencial' | 'desconocida'

/**
 * Cronograma completo de cuotas. Una cuota vencida se resalta con borde y
 * fondo tintados en rojo, más los días de atraso en texto — el cliente tiene
 * que darse cuenta sin leer fechas, no alcanza con la pastilla de estado.
 */
export function TablaCuotas({ cuotas, puedeDeclarar, onDeclarar, declaracion }: TablaCuotasProps) {
  return (
    <section aria-labelledby="titulo-cuotas" className="flex flex-col gap-6">
      <h2 id="titulo-cuotas" className="text-light text-titulo-modal font-bold">
        {CRONOGRAMA.titulo}
      </h2>

      {declaracion === 'presencial' && (
        <p className="border-light/15 text-light/70 flex gap-2 border p-4 text-sm">
          <Info size={16} aria-hidden="true" className="text-secondary mt-0.5 shrink-0" />
          {CRONOGRAMA.pagoPresencial}
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
          <button
            type="button"
            onClick={() => onDeclarar(cuota)}
            className="text-secondary hover:text-light focus-visible:outline-light mt-1 inline-flex w-fit items-center gap-2 rounded py-1 font-mono text-xs tracking-widest uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <Receipt size={14} aria-hidden="true" className="shrink-0" />
            {CRONOGRAMA.declararPago}
            <span className="sr-only"> — {etiquetaCuota(cuota.numero)}</span>
          </button>
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
