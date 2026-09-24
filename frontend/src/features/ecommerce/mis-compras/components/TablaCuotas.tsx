import { AlertTriangle } from 'lucide-react'
import { formatearFechaSinHora } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import { cn } from '@/shared/utils/cn'
import type { CuotaMiVenta } from '../types/miVenta.types'
import { EstadoCuotaPill } from './EstadoCuotaPill'

interface TablaCuotasProps {
  cuotas: CuotaMiVenta[]
}

/**
 * Cronograma completo de cuotas. Una cuota vencida se resalta con borde y
 * fondo tintados en rojo, más los días de atraso en texto — el cliente tiene
 * que darse cuenta sin leer fechas, no alcanza con la pastilla de estado.
 */
export function TablaCuotas({ cuotas }: TablaCuotasProps) {
  return (
    <section aria-labelledby="titulo-cuotas" className="flex flex-col gap-6">
      <h2 id="titulo-cuotas" className="text-light text-titulo-modal font-bold">
        Cronograma de cuotas
      </h2>

      <ul className="flex flex-col gap-3">
        {cuotas.map((cuota) => (
          <li key={cuota.numero}>
            <FilaCuota cuota={cuota} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function FilaCuota({ cuota }: { cuota: CuotaMiVenta }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6',
        cuota.vencido ? 'border-error bg-error/10' : 'border-light/15'
      )}
    >
      <div className="flex flex-col gap-1">
        <span className="text-light/60 font-mono text-xs tracking-widest uppercase">
          {cuota.numero === 0 ? 'Anticipo' : `Cuota ${cuota.numero}`}
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
        {/*
          T116/T117: acá va el botón "Declarar un pago" cuando la cuota está
          vencida (o pendiente/parcial en general). No hay nada visible
          todavía, a propósito — esas tareas lo implementan.
        */}
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
