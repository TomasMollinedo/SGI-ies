import { formatearNumeroComprobante } from '@/features/tesoreria/comprobantes/utils/numeroComprobante'
import type { TipoComprobante } from '@/features/tesoreria/tipos-comprobante/types/tipoComprobante.types'
import { formatearFechaSinHora } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import {
  badgeEfectoSaldo,
  formatearTipoComprobante,
  SIN_DATO,
  textoOSinDato,
} from '../config/pago.config'
import type { PagoDetalle } from '../types/pago.types'
import { formatearCodigoPago } from '../utils/codigoPago'

interface ComprobantePagoImpresionProps {
  pago: PagoDetalle
  /** `FK_tipo_comprobante → tipo`, para mostrar su nombre y marcar cada línea como Debe o Haber (ver `PagoDetalleModal`). */
  tiposComprobantePorId: Map<number, TipoComprobante>
}

/**
 * Documento imprimible de la orden de pago (T93): oculto en pantalla
 * (`hidden print:block`), visible solo al imprimir. El aislamiento de
 * impresión que oculta el resto de la página (modal, botones, menú) vive en
 * `styles/index.css`, atado al atributo `data-imprimible` de este nodo.
 */
export function ComprobantePagoImpresion({
  pago,
  tiposComprobantePorId,
}: ComprobantePagoImpresionProps) {
  return (
    <div data-imprimible className="hidden print:block">
      <h1 className="text-lg font-semibold">Orden de pago {formatearCodigoPago(pago.id_pago)}</h1>

      <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
        <CampoImpresion label="Fecha" value={formatearFechaSinHora(pago.fecha_pago)} />
        <CampoImpresion label="Proveedor" value={pago.proveedor.razon_social} />
        <CampoImpresion label="Forma de pago" value={pago.formaPago.nombre} />
        <CampoImpresion label="N.º de referencia" value={textoOSinDato(pago.numero_referencia)} />
      </dl>

      <table className="border-subtle mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-subtle border-b text-left">
            <th className="py-1.5 font-semibold">Efecto</th>
            <th className="py-1.5 font-semibold">Tipo</th>
            <th className="py-1.5 font-semibold">Comprobante imputado</th>
            <th className="py-1.5 text-right font-semibold">Importe</th>
          </tr>
        </thead>
        <tbody>
          {pago.detalle.map((linea) => {
            const tipo = tiposComprobantePorId.get(linea.comprobante.FK_tipo_comprobante)

            return (
              <tr key={linea.id_detalle_pago} className="border-subtle border-b">
                <td className="py-1.5">{badgeEfectoSaldo(tipo?.aumenta_saldo)}</td>
                <td className="py-1.5">
                  {tipo ? formatearTipoComprobante(tipo.nombre, linea.comprobante.letra) : SIN_DATO}
                </td>
                <td className="py-1.5">{formatearNumeroComprobante(linea.comprobante)}</td>
                <td className="py-1.5 text-right">{formatearImporte(linea.importe_imputado)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end gap-8 text-base font-semibold">
        <span>Total abonado</span>
        <span>{formatearImporte(pago.importe_total)}</span>
      </div>
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
