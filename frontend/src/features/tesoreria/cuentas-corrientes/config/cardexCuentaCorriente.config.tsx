import { ArrowDown, ArrowUp } from 'lucide-react'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import type { SelectOption } from '@/shared/components/ui/Select'
import { Badge } from '@/shared/components/ui/Badge'
import { formatearFechaSinHora } from '@/shared/utils/fecha'
import { claseSaldo, formatearMoneda } from './cuentaCorriente.config'
import type {
  ClaseFiltroCardex,
  ClaseMovimientoCardex,
  MovimientoCuentaCorriente,
} from '../types/cardexCuentaCorriente.types'

/** Texto de los campos que vienen nulos o en cero. */
const SIN_DATO = '—'

/**
 * Solo `COMPROBANTE` y `PAGO` son un valor de filtro válido: la apertura no se
 * pide, la genera el backend solo cuando hay `fechaDesde`.
 */
export const OPCIONES_CLASE: SelectOption[] = [
  { value: '', label: 'Todos los movimientos' },
  { value: 'COMPROBANTE', label: 'Comprobantes' },
  { value: 'PAGO', label: 'Pagos' },
] satisfies { value: ClaseFiltroCardex | ''; label: string }[]

const ETIQUETA_CLASE: Record<ClaseMovimientoCardex, string> = {
  APERTURA: 'Apertura',
  COMPROBANTE: 'Comprobante',
  PAGO: 'Pago',
}

/** El número del comprobante en el formato habitual: letra + punto de venta-número. */
function formatearNumeroComprobante(movimiento: MovimientoCuentaCorriente): string {
  const puntoDeVenta = String(movimiento.punto_de_venta).padStart(4, '0')
  const numero = String(movimiento.numero).padStart(8, '0')
  return `${movimiento.tipo} ${movimiento.letra} ${puntoDeVenta}-${numero}`.trim()
}

export const COLUMNAS_CARDEX_CUENTA_CORRIENTE: DataTableColumn<MovimientoCuentaCorriente>[] = [
  {
    key: 'fecha',
    label: 'Fecha',
    render: (movimiento) => (
      <span className="whitespace-nowrap">{formatearFechaSinHora(movimiento.fecha)}</span>
    ),
  },
  {
    key: 'clase',
    label: 'Clase',
    render: (movimiento) => (
      <Badge variant={movimiento.clase === 'APERTURA' ? 'inactive' : 'active'} dot={false}>
        {ETIQUETA_CLASE[movimiento.clase]}
      </Badge>
    ),
  },
  {
    key: 'comprobante',
    label: 'Concepto',
    render: (movimiento) => {
      if (movimiento.clase === 'APERTURA') {
        return <span className="text-content-muted">Saldo de apertura</span>
      }
      if (movimiento.clase === 'PAGO') {
        return movimiento.tipo
      }
      return formatearNumeroComprobante(movimiento)
    },
  },
  {
    key: 'vencimiento',
    label: 'Vencimiento',
    // El flag lo manda el backend: ya tiene en cuenta si está saldado, no solo
    // si la fecha pasó — un comprobante pago no se marca como vencido.
    render: (movimiento) =>
      movimiento.fecha_vencimiento ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="whitespace-nowrap">
            {formatearFechaSinHora(movimiento.fecha_vencimiento)}
          </span>
          {movimiento.vencido && (
            <Badge variant="error" dot={false}>
              Vencido
            </Badge>
          )}
        </div>
      ) : (
        SIN_DATO
      ),
  },
  {
    key: 'debe',
    label: 'Debe',
    headerTooltip:
      'Nota de crédito o pago registrado: reduce lo que la empresa le debe al proveedor.',
    // Resta del saldo (menos deuda para la empresa): flecha para abajo, en verde.
    render: (movimiento) =>
      movimiento.debe ? (
        <span className="text-success inline-flex items-center gap-1 font-medium">
          <ArrowDown className="size-4" aria-hidden="true" />
          {formatearMoneda(movimiento.debe)}
        </span>
      ) : (
        SIN_DATO
      ),
  },
  {
    key: 'haber',
    label: 'Haber',
    headerTooltip:
      'Factura o nota de débito registrada: aumenta lo que la empresa le debe al proveedor.',
    // Suma al saldo (más deuda para la empresa): flecha para arriba, en rojo.
    render: (movimiento) =>
      movimiento.haber ? (
        <span className="text-error inline-flex items-center gap-1 font-medium">
          <ArrowUp className="size-4" aria-hidden="true" />
          {formatearMoneda(movimiento.haber)}
        </span>
      ) : (
        SIN_DATO
      ),
  },
  {
    key: 'saldoAcumulado',
    label: 'Saldo acumulado',
    render: (movimiento) => (
      <span className={claseSaldo(movimiento.saldo_acumulado)}>
        {formatearMoneda(movimiento.saldo_acumulado)}
      </span>
    ),
  },
]
