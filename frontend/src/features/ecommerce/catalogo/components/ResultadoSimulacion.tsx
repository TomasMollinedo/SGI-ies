import type { SimulacionCatalogo } from '@/features/ecommerce/types/catalogoPublico.types'
import { formatearPorcentaje } from '@/features/ecommerce/utils/formatearPorcentaje'
import { formatearImporte } from '@/shared/utils/importe'
import { PLANES, SIMULADOR } from '../config/catalogo.config'

interface ResultadoSimulacionProps {
  simulacion: SimulacionCatalogo
}

/** Totales y cronograma de una simulación. La cuota 0 del cronograma es el anticipo. */
export function ResultadoSimulacion({ simulacion }: ResultadoSimulacionProps) {
  const { plazo } = simulacion
  const columnas = SIMULADOR.cronogramaColumnas

  return (
    <section
      aria-labelledby="titulo-resultado-simulacion"
      aria-live="polite"
      className="border-light/10 flex flex-col gap-6 border-t pt-6"
    >
      <h4 id="titulo-resultado-simulacion" className="text-light text-subtitulo font-bold">
        {SIMULADOR.resultadoTitulo}
      </h4>

      <dl className="border-light/10 flex flex-col border-t text-sm">
        <Fila
          etiqueta={SIMULADOR.precioContado}
          valor={formatearImporte(simulacion.precio_lista)}
        />
        <Fila
          etiqueta={PLANES.anticipo}
          valor={`${formatearPorcentaje(simulacion.anticipo_porcentaje)} · ${formatearImporte(simulacion.anticipo_monto)}`}
        />
        <Fila
          etiqueta={PLANES.saldoFinanciado}
          valor={formatearImporte(simulacion.saldo_financiado)}
        />
        <Fila
          etiqueta={`${PLANES.cuotas(plazo.cantidad_cuotas)} · ${PLANES.tna} ${formatearPorcentaje(plazo.tasa_nominal_anual)}`}
          valor={formatearImporte(simulacion.valor_cuota)}
          destacada
        />
        <Fila
          etiqueta={PLANES.totalIntereses}
          valor={formatearImporte(simulacion.total_intereses)}
        />
        <Fila
          etiqueta={PLANES.totalAPagar}
          valor={formatearImporte(simulacion.total_a_pagar)}
          destacada
        />
      </dl>

      <div className="flex flex-col gap-3">
        <h5 className="text-light font-mono text-xs tracking-widest uppercase">
          {SIMULADOR.cronogramaTitulo}
        </h5>

        <div className="border-light/10 max-h-96 overflow-auto border">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="bg-dark-deep text-light/60 sticky top-0 font-mono text-xs tracking-widest uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-normal">
                  {columnas.cuota}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-normal">
                  {columnas.capital}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-normal">
                  {columnas.interes}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-normal">
                  {columnas.importe}
                </th>
              </tr>
            </thead>
            <tbody>
              {simulacion.cronograma.map((cuota) => (
                <tr key={cuota.numero} className="border-light/10 text-light border-t">
                  <th scope="row" className="px-4 py-2.5 font-normal">
                    {cuota.numero === 0 ? PLANES.anticipo : `Cuota ${cuota.numero}`}
                  </th>
                  <td className="px-4 py-2.5 text-right">
                    {formatearImporte(cuota.importe_capital)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {formatearImporte(cuota.importe_interes)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold">
                    {formatearImporte(cuota.importe)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

interface FilaProps {
  etiqueta: string
  valor: string
  destacada?: boolean
}

function Fila({ etiqueta, valor, destacada = false }: FilaProps) {
  return (
    <div className="border-light/10 flex items-baseline justify-between gap-4 border-b py-2.5">
      <dt className="text-light/60">{etiqueta}</dt>
      <dd className={destacada ? 'text-secondary text-base font-bold' : 'text-light'}>{valor}</dd>
    </div>
  )
}
