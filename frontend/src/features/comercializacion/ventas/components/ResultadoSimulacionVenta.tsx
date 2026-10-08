import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { DataTable } from '@/shared/components/common/DataTable'
import { formatearFecha } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import { TIPO_PLAN_LABEL } from '@/features/comercializacion/planes-pago/config/planPago.config'
import { SIN_DATO } from '../config/venta.config'
import type { CuotaSimulada, SimulacionVenta } from '../types/venta.types'

interface ResultadoSimulacionVentaProps {
  simulacion: SimulacionVenta
}

const COLUMNAS_CRONOGRAMA: DataTableColumn<CuotaSimulada>[] = [
  { key: 'numero', label: 'Cuota', render: (c) => (c.numero === 0 ? 'Anticipo' : `#${c.numero}`) },
  { key: 'vencimiento', label: 'Vencimiento', render: (c) => formatearFecha(c.fecha_vencimiento) },
  { key: 'capital', label: 'Capital', render: (c) => formatearImporte(Number(c.importe_capital)) },
  { key: 'interes', label: 'Interés', render: (c) => formatearImporte(Number(c.importe_interes)) },
  { key: 'importe', label: 'Importe', render: (c) => formatearImporte(Number(c.importe)) },
  // Deuda del plan después de pagar esa cuota (0 en la última): pedido explícito del ticket.
  { key: 'saldo', label: 'Saldo', render: (c) => formatearImporte(Number(c.saldo_capital)) },
]

/**
 * El resultado de la simulación de la venta (HU-27): resumen del plan y
 * cronograma completo. Los importes del backend vienen `string`: se
 * convierten a número recién acá, al mostrarlos.
 */
export function ResultadoSimulacionVenta({ simulacion }: ResultadoSimulacionVentaProps) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Fila etiqueta="Precio" valor={formatearImporte(Number(simulacion.precio_lista))} />
        <Fila
          etiqueta="Anticipo"
          valor={`${simulacion.anticipo_porcentaje} % · ${formatearImporte(Number(simulacion.anticipo_monto))}`}
        />
        <Fila etiqueta="Modalidad" valor={TIPO_PLAN_LABEL[simulacion.modalidad]} />
        <Fila etiqueta="Cuotas" valor={`${simulacion.plazo?.cantidad_cuotas ?? SIN_DATO}`} />
        <Fila
          etiqueta="TNA"
          valor={simulacion.plazo === null ? SIN_DATO : `${simulacion.plazo.tasa_nominal_anual} %`}
        />
        <Fila
          etiqueta="Valor de cuota"
          valor={
            simulacion.valor_cuota === null
              ? SIN_DATO
              : formatearImporte(Number(simulacion.valor_cuota))
          }
        />
        <Fila
          etiqueta="Saldo financiado"
          valor={formatearImporte(Number(simulacion.saldo_financiado))}
        />
        <Fila
          etiqueta="Total de intereses"
          valor={formatearImporte(Number(simulacion.total_intereses))}
        />
        <Fila etiqueta="Total a pagar" valor={formatearImporte(Number(simulacion.total_a_pagar))} />
      </dl>

      <div>
        <h4 className="text-content mb-2 text-sm font-semibold">Cronograma</h4>
        <div className="overflow-x-auto [&>table]:min-w-2xl">
          <DataTable
            data={simulacion.cuotas}
            columns={COLUMNAS_CRONOGRAMA}
            obtenerId={(c) => String(c.numero)}
            ariaLabel="Cronograma de la simulación"
          />
        </div>
      </div>
    </div>
  )
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-content-muted text-xs">{etiqueta}</dt>
      <dd className="text-content font-medium wrap-anywhere">{valor}</dd>
    </div>
  )
}
