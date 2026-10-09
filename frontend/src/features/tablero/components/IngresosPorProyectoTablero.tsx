import { GraficoTorta } from '@/shared/components/common/GraficoTorta'
import { colorPorcionGrafico } from '@/shared/components/common/graficoColores'
import type { GraficoTortaPorcion } from '@/shared/components/common/GraficoTorta'
import { formatearImporte } from '@/shared/utils/importe'
import { MAX_PORCIONES_PROYECTOS, NOMBRE_OTROS_PROYECTOS } from '../config/tablero.config'
import type { IngresoPorProyecto } from '../types/tablero.types'

interface IngresosPorProyectoTableroProps {
  ingresosPorProyecto: IngresoPorProyecto[]
  totalIngresos: number
}

/**
 * Los proyectos con más ingresos, de mayor a menor; el resto se junta en una
 * sola porción para que la torta siga siendo legible con muchos proyectos.
 */
function armarPorciones(ingresosPorProyecto: IngresoPorProyecto[]): GraficoTortaPorcion[] {
  const ordenados = ingresosPorProyecto
    .filter((ingreso) => ingreso.total > 0)
    .sort((a, b) => b.total - a.total)

  const principales = ordenados.slice(0, MAX_PORCIONES_PROYECTOS).map((ingreso) => ({
    nombre: ingreso.proyecto.nombre,
    valor: ingreso.total,
  }))

  const resto = ordenados.slice(MAX_PORCIONES_PROYECTOS)
  if (resto.length === 0) return principales

  return [
    ...principales,
    {
      nombre: NOMBRE_OTROS_PROYECTOS,
      valor: resto.reduce((acumulado, ingreso) => acumulado + ingreso.total, 0),
    },
  ]
}

const FORMATO_PORCENTAJE = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
})

/**
 * Participación de cada proyecto en los ingresos del rango: torta y, al lado,
 * la lista con importe y porcentaje (los mismos valores, en texto). Sin
 * ingresos no hay torta que dibujar, así que se avisa con un texto.
 */
export function IngresosPorProyectoTablero({
  ingresosPorProyecto,
  totalIngresos,
}: IngresosPorProyectoTableroProps) {
  const porciones = armarPorciones(ingresosPorProyecto)

  return (
    <section
      aria-label="Ingresos por proyecto"
      className="bg-fondotabla border-subtle rounded-lg border p-4 shadow-md"
    >
      <h2 className="text-content mb-2 text-base font-semibold">Ingresos por proyecto</h2>

      {porciones.length === 0 ? (
        <p className="text-content-muted py-8 text-center text-sm">
          No hay ingresos para repartir por proyecto en este rango: {formatearImporte(0)}.
        </p>
      ) : (
        <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-2">
          <GraficoTorta
            data={porciones}
            formatearValor={formatearImporte}
            ariaLabel="Gráfico de torta con la participación de cada proyecto en los ingresos. Los mismos valores están en la lista de al lado."
          />

          <ul className="space-y-1 text-sm">
            {porciones.map((porcion, indice) => (
              <li key={porcion.nombre} className="flex justify-between gap-3">
                <span className="text-content flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: colorPorcionGrafico(indice) }}
                  />
                  <span className="min-w-0 wrap-anywhere">{porcion.nombre}</span>
                </span>
                <span className="text-content-muted whitespace-nowrap">
                  {formatearImporte(porcion.valor)} ·{' '}
                  {FORMATO_PORCENTAJE.format((porcion.valor / totalIngresos) * 100)} %
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
