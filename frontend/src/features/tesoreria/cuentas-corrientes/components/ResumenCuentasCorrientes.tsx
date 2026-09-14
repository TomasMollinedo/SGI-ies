import { StatTile } from '@/shared/components/common/StatTile'
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
      <StatTile label="Acreedores" value={resumen.deudores} note="proveedores con saldo a pagar" />
      <StatTile
        label="A favor"
        value={resumen.a_favor}
        note="con crédito a favor nuestro"
        valueClassName="text-success"
      />
      <StatTile label="Sin saldo" value={resumen.sin_saldo} note="cuentas saldadas" />
      <StatTile
        label="Balance neto"
        value={formatearMoneda(Math.abs(resumen.saldo_total))}
        note={etiquetaBalance(resumen.saldo_total)}
        valueClassName={claseBalance(resumen.saldo_total)}
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
