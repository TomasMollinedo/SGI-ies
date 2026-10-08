import { formatearFecha } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import { TIPO_PLAN_LABEL } from '@/features/comercializacion/planes-pago/config/planPago.config'
import { SIN_DATO } from '../config/venta.config'
import type { ClienteVenta, SimulacionVenta } from '../types/venta.types'

interface SimulacionVentaImpresionProps {
  unidadIdentificador: string
  proyectoNombre: string
  cliente: ClienteVenta | null
  simulacion: SimulacionVenta
}

/**
 * Documento imprimible de la simulación (HU-27): oculto en pantalla
 * (`hidden print:block`), visible solo al imprimir — mismo mecanismo que
 * `ComprobantePagoImpresion` (`data-imprimible`, aislamiento en
 * `styles/index.css`). Lleva la leyenda de simulación informativa y la fecha
 * del día, como pide el ticket: es lo que se le entrega al cliente en mano,
 * no un comprobante de venta.
 */
export function SimulacionVentaImpresion({
  unidadIdentificador,
  proyectoNombre,
  cliente,
  simulacion,
}: SimulacionVentaImpresionProps) {
  return (
    <div data-imprimible className="hidden print:block">
      <h1 className="text-lg font-semibold">Simulación de plan de pago</h1>
      <p className="text-sm text-gray-600">{formatearFecha(new Date())}</p>

      <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
        <CampoImpresion label="Unidad" value={unidadIdentificador} />
        <CampoImpresion label="Proyecto" value={proyectoNombre} />
        <CampoImpresion
          label="Cliente"
          value={cliente ? `${cliente.nombre} ${cliente.apellido ?? ''}`.trim() : SIN_DATO}
        />
        <CampoImpresion label="Modalidad" value={TIPO_PLAN_LABEL[simulacion.modalidad]} />
        <CampoImpresion label="Precio" value={formatearImporte(Number(simulacion.precio_lista))} />
        <CampoImpresion
          label="Anticipo"
          value={`${simulacion.anticipo_porcentaje} % · ${formatearImporte(Number(simulacion.anticipo_monto))}`}
        />
        {simulacion.plazo && (
          <>
            <CampoImpresion label="Cuotas" value={`${simulacion.plazo.cantidad_cuotas}`} />
            <CampoImpresion label="TNA" value={`${simulacion.plazo.tasa_nominal_anual} %`} />
            <CampoImpresion
              label="Valor de cuota"
              value={formatearImporte(Number(simulacion.valor_cuota))}
            />
            <CampoImpresion
              label="Total de intereses"
              value={formatearImporte(Number(simulacion.total_intereses))}
            />
          </>
        )}
        <CampoImpresion
          label="Total a pagar"
          value={formatearImporte(Number(simulacion.total_a_pagar))}
        />
      </dl>

      <table className="border-subtle mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-subtle border-b text-left">
            <th className="py-1.5 font-semibold">Cuota</th>
            <th className="py-1.5 font-semibold">Vencimiento</th>
            <th className="py-1.5 text-right font-semibold">Capital</th>
            <th className="py-1.5 text-right font-semibold">Interés</th>
            <th className="py-1.5 text-right font-semibold">Importe</th>
            <th className="py-1.5 text-right font-semibold">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {simulacion.cuotas.map((cuota) => (
            <tr key={cuota.numero} className="border-subtle border-b">
              <td className="py-1.5">{cuota.numero === 0 ? 'Anticipo' : `#${cuota.numero}`}</td>
              <td className="py-1.5">{formatearFecha(cuota.fecha_vencimiento)}</td>
              <td className="py-1.5 text-right">
                {formatearImporte(Number(cuota.importe_capital))}
              </td>
              <td className="py-1.5 text-right">
                {formatearImporte(Number(cuota.importe_interes))}
              </td>
              <td className="py-1.5 text-right">{formatearImporte(Number(cuota.importe))}</td>
              <td className="py-1.5 text-right">{formatearImporte(Number(cuota.saldo_capital))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-6 text-xs text-gray-600">
        Simulación informativa y no vinculante. Los importes son estimativos: se calculan sobre el
        precio de lista y la tasa vigentes al {formatearFecha(new Date())}, y pueden cambiar. No
        genera una reserva ni una venta.
      </p>
    </div>
  )
}

function CampoImpresion({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-content-muted font-medium">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
