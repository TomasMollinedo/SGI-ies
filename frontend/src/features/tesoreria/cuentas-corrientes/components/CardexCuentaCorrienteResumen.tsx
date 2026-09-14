import { StatTile } from '@/shared/components/common/StatTile'
import { claseSaldo, formatearCuit, formatearMoneda } from '../config/cuentaCorriente.config'
import type {
  MovimientoCuentaCorriente,
  ProveedorResumenCardex,
} from '../types/cardexCuentaCorriente.types'

interface CardexCuentaCorrienteResumenProps {
  proveedor: ProveedorResumenCardex
  movimientos: MovimientoCuentaCorriente[]
  /** `true` cuando hay un "hasta" aplicado: cambia la leyenda del saldo. */
  hayFechaHastaAplicada: boolean
}

/**
 * Cabecera del extracto: de qué proveedor es y cuál es el saldo al final de lo
 * que se está viendo.
 *
 * `saldo_acumulado` de la última fila es el saldo real solo cuando no hay
 * `fechaHasta`: con un "hasta" aplicado, es el saldo que tenía en ese momento,
 * no el actual — de eso avisa la nota.
 */
export function CardexCuentaCorrienteResumen({
  proveedor,
  movimientos,
  hayFechaHastaAplicada,
}: CardexCuentaCorrienteResumenProps) {
  const ultimoMovimiento = movimientos.at(-1)
  const saldo = ultimoMovimiento?.saldo_acumulado ?? 0

  return (
    <section aria-label="Ficha de la cuenta corriente" className="grid gap-4 sm:grid-cols-2">
      <div className="bg-fondotabla border-subtle rounded-lg border p-4 shadow-md">
        <p className="text-content-muted text-xs font-medium uppercase">
          Proveedor N.º {proveedor.id_proveedor}
        </p>
        <h2 className="text-content text-lg font-semibold">{proveedor.razon_social}</h2>
        <p className="text-content-muted text-sm">{formatearCuit(proveedor.cuit)}</p>
      </div>

      <StatTile
        className="flex flex-col justify-center"
        label={hayFechaHastaAplicada ? 'Saldo al final del período' : 'Saldo actual'}
        value={formatearMoneda(saldo)}
        valueClassName={claseSaldo(saldo)}
        note={hayFechaHastaAplicada ? 'No es el saldo actual del proveedor' : undefined}
      />
    </section>
  )
}
