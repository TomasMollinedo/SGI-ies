import { datosACotejar } from '../config/declaracionPago.config'
import type { DeclaracionPago } from '../types/declaracionPago.types'

interface DatosDeclaracionProps {
  declaracion: DeclaracionPago
}

/** Los datos de la declaración a cotejar contra el extracto, como lista de términos. */
export function DatosDeclaracion({ declaracion }: DatosDeclaracionProps) {
  return (
    <dl className="border-subtle divide-subtle divide-y rounded-md border">
      {datosACotejar(declaracion).map(({ label, value }) => (
        <div
          key={label}
          className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:justify-between sm:gap-4"
        >
          <dt className="text-content-muted text-xs">{label}</dt>
          <dd className="text-content text-sm font-medium break-all sm:text-right">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
