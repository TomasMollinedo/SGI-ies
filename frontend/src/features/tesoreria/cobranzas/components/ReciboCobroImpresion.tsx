import { formatearFecha } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import { etiquetaNumeroCuota, SIN_DATO, textoOSinDato } from '../config/cobro.config'
import type { CobroDetalle } from '../types/cobro.types'
import { nombreCliente } from '../utils/cliente'
import { formatearCodigoCobro } from '../utils/codigoCobro'

interface ReciboCobroImpresionProps {
  cobro: CobroDetalle
}

/**
 * Recibo imprimible de un cobro (HU-30): oculto en pantalla (`hidden
 * print:block`), visible solo al imprimir. Mismo mecanismo que
 * `ComprobantePagoImpresion`: el aislamiento que oculta el resto de la
 * página vive en `styles/index.css`, atado a `data-imprimible`, así que en
 * la página tiene que haber un solo nodo con ese atributo.
 *
 * Un cobro anulado se sigue pudiendo imprimir, pero el papel lo dice sin
 * ambigüedad: leyenda ANULADO en el encabezado y el motivo.
 */
export function ReciboCobroImpresion({ cobro }: ReciboCobroImpresionProps) {
  const anulado = cobro.estado === 'ANULADO'

  return (
    <div data-imprimible className="hidden print:block">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-lg font-semibold">
          Recibo de cobro {formatearCodigoCobro(cobro.id_cobro)}
        </h1>
        {anulado && (
          <span className="border-error text-error rounded border-4 px-3 py-1 text-2xl font-bold tracking-widest">
            ANULADO
          </span>
        )}
      </div>

      {anulado && (
        <p className="border-error text-error mt-3 border-l-4 pl-3 text-sm">
          <span className="font-semibold">Motivo de anulación:</span>{' '}
          {textoOSinDato(cobro.motivo_anulacion)}
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
        {/* Horario de Argentina: ver el comentario de "Fecha de cobro" en `CobroDetallePage`. */}
        <CampoImpresion label="Fecha" value={formatearFecha(cobro.fecha_cobro)} />
        <CampoImpresion label="Cliente" value={nombreCliente(cobro.cliente)} />
        <CampoImpresion label="DNI/CUIL" value={cobro.cliente.dni_cuil ?? SIN_DATO} />
        <CampoImpresion label="Forma de pago" value={cobro.formaPago.nombre} />
        <CampoImpresion label="N.º de referencia" value={textoOSinDato(cobro.numero_referencia)} />
      </dl>

      <table className="border-subtle mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-subtle border-b text-left">
            <th className="py-1.5 font-semibold">Cuota</th>
            <th className="py-1.5 font-semibold">Unidad</th>
            <th className="py-1.5 text-right font-semibold">Importe imputado</th>
          </tr>
        </thead>
        <tbody>
          {cobro.detalle.map((linea) => (
            <tr key={linea.id_detalle_cobro} className="border-subtle border-b">
              <td className="py-1.5">{etiquetaNumeroCuota(linea.cuota.numero)}</td>
              <td className="py-1.5">{linea.cuota.venta.unidad.identificador}</td>
              <td className="py-1.5 text-right">{formatearImporte(linea.importe_imputado)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end gap-8 text-base font-semibold">
        <span>Importe total recibido</span>
        <span>{formatearImporte(cobro.importe_total)}</span>
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
