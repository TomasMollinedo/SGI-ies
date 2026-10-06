import { TriangleAlert } from 'lucide-react'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { formatearFechaSinHora } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import { cn } from '@/shared/utils/cn'
import type { CuotaSimulada } from '../types/planPago.types'
import { aNumeroOCero } from '../utils/decimal'

interface PrevisualizacionCuotasProps {
  cuotas: CuotaSimulada[] | undefined
  cargando: boolean
  error: string | null
  /** El formulario cambió después de simular: lo que se ve ya no corresponde a las condiciones actuales. */
  desactualizada: boolean
}

/**
 * El cronograma que devuelve `POST /planes-pago/simular-cuotas`. No calcula
 * nada: el motor de cuotas (división, redondeo y el caso del día 31) vive en
 * el backend y es su único dueño, justamente para que esta previsualización no
 * se desincronice de las cuotas que después se generan de verdad.
 *
 * Si el usuario toca el formulario después de simular, lo que está en pantalla
 * deja de corresponder a las condiciones cargadas: en vez de borrarlo se marca
 * como desactualizado (atenuado y con un aviso), para que quede claro que hay
 * que volver a previsualizar.
 */
export function PrevisualizacionCuotas({
  cuotas,
  cargando,
  error,
  desactualizada,
}: PrevisualizacionCuotasProps) {
  if (cargando) {
    return (
      <div className="flex justify-center py-6">
        <Spinner size={24} />
      </div>
    )
  }

  if (error) {
    return (
      <div
        role="alert"
        className="border-error/30 bg-error/10 text-error rounded-md border px-4 py-3 text-xs"
      >
        {error}
      </div>
    )
  }

  if (!cuotas || cuotas.length === 0) return null

  const total = cuotas.reduce((acumulado, cuota) => acumulado + aNumeroOCero(cuota.importe), 0)

  return (
    <div className="flex flex-col gap-2">
      {desactualizada && (
        <p
          role="status"
          className="border-warning/30 bg-warning/10 text-warning flex items-start gap-2 rounded-md border px-3 py-2 text-xs"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Cambiaste las condiciones del plan. Volvé a previsualizar para ver el cronograma
          actualizado.
        </p>
      )}

      <div
        className={cn(
          'border-subtle overflow-hidden rounded-md border',
          desactualizada && 'opacity-50'
        )}
      >
        <table className="w-full text-left text-xs">
          <caption className="sr-only">Cronograma de cuotas simulado</caption>
          <thead className="bg-surface-muted text-content-muted">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Cuota
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Vence
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Importe
              </th>
            </tr>
          </thead>
          <tbody>
            {cuotas.map((cuota) => (
              <tr key={cuota.numero} className="border-subtle border-t">
                <td className="text-content px-3 py-2">
                  {cuota.numero === 0 ? 'Anticipo' : cuota.numero}
                </td>
                <td className="text-content-muted px-3 py-2 whitespace-nowrap">
                  {formatearFechaSinHora(cuota.fecha_vencimiento)}
                </td>
                <td className="text-content px-3 py-2 text-right wrap-anywhere">
                  {formatearImporte(aNumeroOCero(cuota.importe))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-surface-muted">
            <tr className="border-subtle border-t">
              <td colSpan={2} className="text-content px-3 py-2 font-medium">
                Total
              </td>
              <td className="text-content px-3 py-2 text-right font-semibold wrap-anywhere">
                {formatearImporte(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-content-muted text-xs">
        Simulación desde hoy. Los vencimientos reales se calculan desde la fecha de la venta.
      </p>
    </div>
  )
}
