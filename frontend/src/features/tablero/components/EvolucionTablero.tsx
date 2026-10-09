import { DataTable } from '@/shared/components/common/DataTable'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { GraficoBarras } from '@/shared/components/common/GraficoBarras'
import { cn } from '@/shared/utils/cn'
import { formatearImporte } from '@/shared/utils/importe'
import type { PeriodoTablero } from '../types/tablero.types'
import {
  claseColorResultado,
  formatearEtiquetaPeriodo,
  formatearImporteConSigno,
} from '../utils/formato'

interface EvolucionTableroProps {
  periodos: PeriodoTablero[]
}

const COLUMNAS: DataTableColumn<PeriodoTablero>[] = [
  {
    key: 'periodo',
    label: 'Período',
    render: (periodo) => formatearEtiquetaPeriodo(periodo.etiqueta),
  },
  {
    key: 'ingresos',
    label: 'Ingresos',
    render: (periodo) => formatearImporte(periodo.ingresos),
  },
  {
    key: 'egresos',
    label: 'Egresos',
    render: (periodo) => formatearImporte(periodo.egresos),
  },
  {
    key: 'resultado',
    label: 'Resultado',
    render: (periodo) => (
      <span className={cn('font-semibold', claseColorResultado(periodo.resultado))}>
        {periodo.resultado === null ? '—' : formatearImporteConSigno(periodo.resultado)}
      </span>
    ),
  },
]

/**
 * Evolución del rango: barras de ingresos y egresos de cada período y, debajo,
 * la tabla con los mismos valores más el resultado. El gráfico es una ayuda
 * visual; la tabla es la fuente exacta (y lo que leen los lectores de pantalla).
 */
export function EvolucionTablero({ periodos }: EvolucionTableroProps) {
  const datos = periodos.map((periodo) => ({
    periodo: formatearEtiquetaPeriodo(periodo.etiqueta),
    ingresos: periodo.ingresos,
    egresos: periodo.egresos,
  }))

  return (
    <section aria-label="Evolución por período" className="space-y-4">
      <div className="bg-fondotabla border-subtle rounded-lg border p-4 shadow-md">
        <h2 className="text-content mb-2 text-base font-semibold">
          Ingresos y egresos por período
        </h2>
        <GraficoBarras
          data={datos}
          claveCategoria="periodo"
          series={[
            { clave: 'ingresos', nombre: 'Ingresos', color: 'success' },
            { clave: 'egresos', nombre: 'Egresos', color: 'primary' },
          ]}
          formatearValor={formatearImporte}
          ariaLabel="Gráfico de barras de ingresos y egresos por período. Los mismos valores están en la tabla de abajo."
        />
      </div>

      <DataTable
        data={periodos}
        columns={COLUMNAS}
        obtenerId={(periodo) => periodo.etiqueta}
        ariaLabel="Ingresos, egresos y resultado por período"
      />
    </section>
  )
}
