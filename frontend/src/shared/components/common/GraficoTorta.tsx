import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { colorPorcionGrafico, ESTILO_TOOLTIP } from './graficoColores'

export interface GraficoTortaPorcion {
  nombre: string
  valor: number
}

interface GraficoTortaProps {
  data: GraficoTortaPorcion[]
  /** Formato del valor en el tooltip (ej. `formatearImporte`). */
  formatearValor: (valor: number) => string
  /** Descripción para lectores de pantalla; el gráfico no reemplaza a la lista o tabla de datos. */
  ariaLabel: string
  /** Alto en píxeles. Default: 300. */
  alto?: number
}

/**
 * Gráfico de torta (en formato dona). Envuelve a Recharts, igual que
 * `GraficoBarras`. El color de cada porción sale de su posición en `data`
 * (`colorPorcionGrafico`), así que el orden que llega es el que se ve. No
 * dibuja leyenda: la pantalla la arma con una lista que usa los mismos colores.
 *
 * No maneja el caso "sin datos": una torta sin porciones no dibuja nada, así
 * que la pantalla decide qué mostrar en su lugar.
 */
export function GraficoTorta({ data, formatearValor, ariaLabel, alto = 300 }: GraficoTortaProps) {
  return (
    <div role="img" aria-label={ariaLabel} style={{ height: alto }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="valor"
            nameKey="nombre"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={data.length > 1 ? 2 : 0}
            stroke="var(--color-fondotabla)"
          >
            {data.map((porcion, indice) => (
              <Cell key={porcion.nombre} fill={colorPorcionGrafico(indice)} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={ESTILO_TOOLTIP}
            formatter={(valor) => formatearValor(Number(valor))}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
