import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { colorGrafico, ESTILO_TOOLTIP, type GraficoColor } from './graficoColores'

export interface GraficoBarrasSerie {
  /** Propiedad de cada elemento de `data` de la que sale el valor de la barra. */
  clave: string
  /** Nombre que se ve en la leyenda y en el tooltip. */
  nombre: string
  color: GraficoColor
}

interface GraficoBarrasProps {
  data: Record<string, string | number>[]
  /** Propiedad de cada elemento de `data` que se escribe en el eje horizontal. */
  claveCategoria: string
  series: GraficoBarrasSerie[]
  /** Formato del valor en el tooltip (ej. `formatearImporte`). */
  formatearValor: (valor: number) => string
  /** Descripción para lectores de pantalla; el gráfico no reemplaza a la tabla de datos. */
  ariaLabel: string
  /** Alto en píxeles. Default: 320. */
  alto?: number
}

/** Importes del eje vertical abreviados ("1,2 M") para que no ocupen medio gráfico. */
const FORMATO_EJE = new Intl.NumberFormat('es-AR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

/**
 * Gráfico de barras agrupadas (una barra por serie en cada categoría). Envuelve
 * a Recharts: las pantallas no importan la librería, solo pasan los datos.
 *
 * Con todos los valores en cero dibuja igual los ejes y las categorías: un
 * rango sin movimientos se ve como ceros, no como un hueco.
 */
export function GraficoBarras({
  data,
  claveCategoria,
  series,
  formatearValor,
  ariaLabel,
  alto = 320,
}: GraficoBarrasProps) {
  // Con todo en cero Recharts inventa una escala (0–4) sobre un gráfico vacío:
  // se deja solo el 0, que es lo único que dicen los datos.
  const todoEnCero = data.every((fila) => series.every((serie) => Number(fila[serie.clave]) === 0))

  return (
    <div role="img" aria-label={ariaLabel} style={{ height: alto }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-subtle)" />
          <XAxis
            dataKey={claveCategoria}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-subtle)' }}
            tick={{ fill: 'var(--color-content-muted)', fontSize: 13 }}
          />
          <YAxis
            width={56}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            domain={todoEnCero ? [0, 1] : [0, 'auto']}
            ticks={todoEnCero ? [0] : undefined}
            tickFormatter={(valor: number) => FORMATO_EJE.format(valor)}
            tick={{ fill: 'var(--color-content-muted)', fontSize: 13 }}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-surface-muted)', opacity: 0.6 }}
            contentStyle={ESTILO_TOOLTIP}
            formatter={(valor) => formatearValor(Number(valor))}
          />
          {/* `itemSorter={null}`: por defecto Recharts ordena la leyenda alfabéticamente. */}
          <Legend itemSorter={null} wrapperStyle={{ fontSize: 'var(--text-xs)' }} />
          {series.map((serie) => (
            <Bar
              key={serie.clave}
              dataKey={serie.clave}
              name={serie.nombre}
              fill={colorGrafico(serie.color)}
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
