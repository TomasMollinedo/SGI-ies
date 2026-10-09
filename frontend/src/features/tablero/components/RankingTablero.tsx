import { Spinner } from '@/shared/components/ui/Spinner'
import { formatearImporte } from '@/shared/utils/importe'
import type { Ranking } from '../types/tablero.types'

interface RankingTableroProps {
  titulo: string
  /** `undefined` mientras todavía no llegó. */
  ranking?: Ranking
  cargando?: boolean
  error?: boolean
}

const FORMATO_PORCENTAJE = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
})

/**
 * Los que más ingresos aportaron en el rango, de mayor a menor: posición,
 * nombre, importe y qué parte del total de ingresos representan (en número y
 * en una barra). Sirve igual para proyectos que para clientes.
 */
export function RankingTablero({ titulo, ranking, cargando, error }: RankingTableroProps) {
  return (
    <section
      aria-label={titulo}
      className="bg-fondotabla border-subtle rounded-lg border p-4 shadow-md"
    >
      <h2 className="text-content mb-3 text-base font-semibold">{titulo}</h2>

      {cargando && (
        <div className="flex justify-center py-8">
          <Spinner className="text-primary size-6" />
        </div>
      )}

      {!cargando && error && (
        <p className="text-error py-8 text-center text-sm">No se pudo cargar este ranking.</p>
      )}

      {!cargando && !error && ranking && ranking.items.length === 0 && (
        <p className="text-content-muted py-8 text-center text-sm">
          Sin ingresos en este rango: {formatearImporte(0)}.
        </p>
      )}

      {!cargando && !error && ranking && ranking.items.length > 0 && (
        <ol className="space-y-3">
          {ranking.items.map((item, indice) => {
            const porcentaje =
              ranking.totalIngresos > 0 ? (item.total / ranking.totalIngresos) * 100 : 0

            return (
              <li key={item.id} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="bg-secondary-soft text-content flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                >
                  {indice + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-content min-w-0 font-medium wrap-anywhere">
                      {item.nombre}
                    </span>
                    <span className="text-content whitespace-nowrap">
                      {formatearImporte(item.total)}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-2">
                    <div className="bg-surface-muted h-2 flex-1 overflow-hidden rounded-full">
                      <div
                        className="bg-success h-full rounded-full"
                        style={{ width: `${Math.min(porcentaje, 100)}%` }}
                      />
                    </div>
                    <span className="text-content-muted w-14 text-right text-xs">
                      {FORMATO_PORCENTAJE.format(porcentaje)} %
                    </span>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
