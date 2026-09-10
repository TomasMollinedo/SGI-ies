import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'
import { formatearMoneda } from '../config/cuentaCorriente.config'
import type { ResumenCuentasCorrientes as ResumenCuentasCorrientesData } from '../types/cuentaCorriente.types'

interface ResumenCuentasCorrientesProps {
  resumen: ResumenCuentasCorrientesData
}

/**
 * La card del listado: cuatro números fijos, siempre los mismos 4 tiles sin
 * importar el filtro de condición de saldo (`condicionSaldo`) — es estable
 * frente a ese filtro, y solo cambia con `FKProveedor` o `estado`.
 *
 * El signo del balance neto es lo que distingue un saldo a favor de la
 * empresa (verde) de una deuda (rojo) de un vistazo, sin tener que leer la tabla.
 */
export function ResumenCuentasCorrientes({ resumen }: ResumenCuentasCorrientesProps) {
  return (
    <section
      aria-label="Resumen de cuentas corrientes"
      className="grid grid-cols-2 gap-4 lg:grid-cols-4"
    >
      <Tarjeta etiqueta="Deudores" valor={resumen.deudores} nota="proveedores con saldo a pagar" />
      <Tarjeta
        etiqueta="A favor"
        valor={resumen.a_favor}
        nota="con crédito a favor nuestro"
        valorClassName="text-success"
      />
      <Tarjeta etiqueta="Sin saldo" valor={resumen.sin_saldo} nota="cuentas saldadas" />
      <Tarjeta
        etiqueta="Balance neto"
        valor={formatearMoneda(Math.abs(resumen.saldo_total))}
        nota={etiquetaBalance(resumen.saldo_total)}
        valorClassName={claseBalance(resumen.saldo_total)}
      />
    </section>
  )
}

function etiquetaBalance(saldoTotal: number): string {
  if (saldoTotal > 0) return 'a pagar'
  if (saldoTotal < 0) return 'a favor'
  return 'sin saldo'
}

function claseBalance(saldoTotal: number): string | undefined {
  if (saldoTotal > 0) return 'text-error'
  if (saldoTotal < 0) return 'text-success'
  return undefined
}

function Tarjeta({
  etiqueta,
  valor,
  nota,
  valorClassName,
}: {
  etiqueta: string
  valor: ReactNode
  nota: string
  valorClassName?: string
}) {
  return (
    <div className="bg-fondotabla border-subtle rounded-lg border p-4 shadow-md">
      <dl>
        <dt className="text-content-muted text-xs font-medium uppercase">{etiqueta}</dt>
        <dd className={cn('text-content mt-1 text-2xl font-semibold', valorClassName)}>{valor}</dd>
      </dl>
      <p className="text-content-muted mt-1 text-xs">{nota}</p>
    </div>
  )
}
