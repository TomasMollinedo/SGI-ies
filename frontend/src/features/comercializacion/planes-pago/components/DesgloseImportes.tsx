import { formatearImporte } from '@/shared/utils/importe'
import type { ImportesPlanEjemplo } from '../types/planEjemplo.types'
import { aNumeroOCero } from '../utils/decimal'

interface DesgloseImportesProps {
  importes: ImportesPlanEjemplo
  cantidadCuotas: number
}

/**
 * Los importes de un plan de ejemplo: anticipo, saldo a financiar, cuota,
 * intereses y total a pagar. No calcula nada —solo formatea lo que devolvió el
 * backend— para que lo que se ve acá, en el formulario y en el catálogo salga
 * siempre del mismo cálculo.
 */
export function DesgloseImportes({ importes, cantidadCuotas }: DesgloseImportesProps) {
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
      <Importe etiqueta="Anticipo" valor={importes.anticipo_monto} />
      <Importe etiqueta="Saldo a financiar" valor={importes.saldo_financiado} />
      <Importe
        etiqueta="Cuota"
        valor={importes.valor_cuota}
        detalle={`${cantidadCuotas} cuota${cantidadCuotas === 1 ? '' : 's'} mensuales`}
      />
      <Importe etiqueta="Intereses" valor={importes.total_intereses} />
      <Importe etiqueta="Total a pagar" valor={importes.total_a_pagar} destacado />
    </dl>
  )
}

interface ImporteProps {
  etiqueta: string
  valor: string
  detalle?: string
  destacado?: boolean
}

function Importe({ etiqueta, valor, detalle, destacado = false }: ImporteProps) {
  return (
    <div className="flex min-w-0 justify-between gap-2 sm:block">
      <dt className="text-content-muted font-medium uppercase">{etiqueta}</dt>
      <dd className="text-content wrap-anywhere">
        <span className={destacado ? 'text-base font-semibold' : 'font-medium'}>
          {formatearImporte(aNumeroOCero(valor))}
        </span>
        {detalle && <span className="text-content-muted block">{detalle}</span>}
      </dd>
    </div>
  )
}
