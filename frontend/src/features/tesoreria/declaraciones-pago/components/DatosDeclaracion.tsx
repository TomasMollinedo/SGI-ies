import { datosACotejar, descripcionDeclaracion } from '../config/declaracionPago.config'
import type { DeclaracionPago } from '../types/declaracionPago.types'
import { BotonVerComprobante } from './BotonVerComprobante'

interface DatosDeclaracionProps {
  declaracion: DeclaracionPago
}

const CLASES_FILA = 'flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:justify-between sm:gap-4'

/** Los datos de la declaración a cotejar contra el extracto, como lista de términos. */
export function DatosDeclaracion({ declaracion }: DatosDeclaracionProps) {
  return (
    <dl className="border-subtle divide-subtle divide-y rounded-md border">
      {datosACotejar(declaracion).map(({ label, value }) => (
        <div key={label} className={CLASES_FILA}>
          <dt className="text-content-muted text-xs">{label}</dt>
          <dd className="text-content text-sm font-medium break-all sm:text-right">{value}</dd>
        </div>
      ))}

      {/* Justo debajo del N.º de referencia (el último dato a cotejar), para contrastarlos. */}
      <div className={CLASES_FILA}>
        <dt className="text-content-muted text-xs">Comprobante</dt>
        <dd className="sm:text-right">
          {declaracion.tiene_comprobante ? (
            <BotonVerComprobante
              idDeclaracionPago={declaracion.id_declaracion_pago}
              descripcion={descripcionDeclaracion(declaracion)}
            />
          ) : (
            <span className="text-content-muted text-sm">Sin comprobante</span>
          )}
        </dd>
      </div>
    </dl>
  )
}
