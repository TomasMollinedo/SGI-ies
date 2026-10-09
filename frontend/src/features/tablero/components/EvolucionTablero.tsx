import { GraficoBarras } from '@/shared/components/common/GraficoBarras'
import { formatearImporte } from '@/shared/utils/importe'
import type { PeriodoTablero } from '../types/tablero.types'
import { formatearEtiquetaPeriodo } from '../utils/formato'

interface EvolucionTableroProps {
  periodos: PeriodoTablero[]
  /** Con un proyecto elegido, los ingresos son de ese proyecto y los egresos siguen siendo de toda la empresa. */
  tieneFiltroProyecto?: boolean
}

/**
 * Evolución del rango: barras de ingresos y egresos de cada período. Al
 * filtrar por proyecto el gráfico se queda, pero avisa que las dos series
 * dejan de ser comparables: los egresos no se pueden atribuir a un proyecto.
 */
export function EvolucionTablero({ periodos, tieneFiltroProyecto = false }: EvolucionTableroProps) {
  const datos = periodos.map((periodo) => ({
    periodo: formatearEtiquetaPeriodo(periodo.etiqueta),
    ingresos: periodo.ingresos,
    egresos: periodo.egresos,
  }))

  return (
    <section
      aria-label="Evolución por período"
      className="bg-fondotabla border-subtle rounded-lg border p-4 shadow-md"
    >
      <h2 className="text-content mb-2 text-base font-semibold">Ingresos y egresos por período</h2>
      {tieneFiltroProyecto && (
        <p className="text-content-muted mb-2 text-xs">
          Los ingresos son solo del proyecto seleccionado; los egresos son de toda la empresa.
        </p>
      )}
      <GraficoBarras
        data={datos}
        claveCategoria="periodo"
        series={[
          { clave: 'ingresos', nombre: 'Ingresos', color: 'success' },
          { clave: 'egresos', nombre: 'Egresos', color: 'primary' },
        ]}
        formatearValor={formatearImporte}
        ariaLabel="Gráfico de barras de ingresos y egresos por período"
      />
    </section>
  )
}
