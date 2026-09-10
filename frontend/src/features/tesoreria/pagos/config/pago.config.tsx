import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { formatearNumeroComprobante } from '@/features/tesoreria/comprobantes/utils/numeroComprobante'
import { Badge } from '@/shared/components/ui/Badge'
import { formatearFecha } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import type { EstadoPago, LineaPago, Pago, UsuarioResumen } from '../types/pago.types'
import { formatearCodigoPago } from '../utils/codigoPago'

/** Resultados por página del listado. Fijo por ahora, igual que en el resto de los listados. */
export const LIMITE_PAGINA = 10

/** Texto de los campos opcionales que el backend devuelve en `null`. */
export const SIN_DATO = '—'

export function textoOSinDato(valor: string | null | undefined): string {
  return valor?.trim() || SIN_DATO
}

export function nombreCompleto(usuario: UsuarioResumen | null | undefined): string {
  if (!usuario) return SIN_DATO
  return `${usuario.nombre} ${usuario.apellido}`
}

/** Pastilla del estado del pago. Se usa en el listado y en el detalle. */
export function badgeEstadoPago(estado: EstadoPago) {
  return (
    <Badge variant={estado === 'CONFIRMADA' ? 'active' : 'inactive'}>
      {estado === 'CONFIRMADA' ? 'Confirmado' : 'Anulado'}
    </Badge>
  )
}

/**
 * Las columnas de datos. No hay columna de acciones: T91 es solo el listado,
 * ver el detalle o anular un pago quedan para otra tarea.
 */
export const COLUMNAS_PAGOS: DataTableColumn<Pago>[] = [
  {
    key: 'codigo',
    label: 'Código',
    render: (item) => (
      <span className="whitespace-nowrap">{formatearCodigoPago(item.id_pago)}</span>
    ),
  },
  {
    key: 'fecha',
    label: 'Fecha',
    // Fecha de negocio (cuándo se pagó), no la hora de carga del registro.
    render: (item) => formatearFecha(item.fecha_pago),
  },
  { key: 'proveedor', label: 'Proveedor', render: (item) => item.proveedor.razon_social },
  { key: 'formaPago', label: 'Forma de pago', render: (item) => item.formaPago.nombre },
  {
    key: 'referencia',
    label: 'N.º de referencia',
    render: (item) => item.numero_referencia?.trim() || SIN_DATO,
  },
  {
    key: 'importe',
    label: 'Importe',
    render: (item) => (
      <span className="whitespace-nowrap">{formatearImporte(item.importe_total)}</span>
    ),
  },
  { key: 'estado', label: 'Estado', render: (item) => badgeEstadoPago(item.estado) },
]

/** Columnas de la grilla de imputaciones dentro del detalle de un pago. */
export const COLUMNAS_DETALLE_PAGO: DataTableColumn<LineaPago>[] = [
  {
    key: 'comprobante',
    label: 'Comprobante',
    render: (linea) => formatearNumeroComprobante(linea.comprobante),
  },
  {
    key: 'importeImputado',
    label: 'Importe imputado',
    render: (linea) => formatearImporte(linea.importe_imputado),
  },
  {
    key: 'saldoAnterior',
    label: 'Saldo anterior',
    render: (linea) => formatearImporte(linea.saldo_anterior),
  },
  {
    key: 'saldoPosterior',
    label: 'Saldo posterior',
    render: (linea) => formatearImporte(linea.saldo_posterior),
  },
]
