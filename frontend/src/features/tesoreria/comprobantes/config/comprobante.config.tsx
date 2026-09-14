import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Badge } from '@/shared/components/ui/Badge'
import type { SelectOption } from '@/shared/components/ui/Select'
import { formatearFechaSinHora } from '@/shared/utils/fecha'
import type {
  ComprobanteListItem,
  EstadoComprobante,
  EstadoSaldo,
  LineaComprobante,
  UsuarioResumen,
} from '../types/comprobante.types'
import { formatearMoneda } from '../utils/formatearMoneda'
import { formatearNumeroComprobante } from '../utils/numeroComprobante'

/** Resultados por página del listado. Fijo, igual que el resto de los listados. */
export const LIMITE_PAGINA = 10

/** Texto de los campos que vienen nulos o vacíos. */
export const SIN_DATO = '—'

export function textoOSinDato(valor: string | null | undefined): string {
  return valor?.trim() || SIN_DATO
}

export function nombreCompleto(usuario: UsuarioResumen | null | undefined): string {
  if (!usuario) return SIN_DATO
  return `${usuario.nombre} ${usuario.apellido}`
}

const ESTADO_META: Record<
  EstadoComprobante,
  { label: string; variant: 'active' | 'inactive' | 'error' }
> = {
  BORRADOR: { label: 'Borrador', variant: 'inactive' },
  REGISTRADO: { label: 'Registrado', variant: 'active' },
  ANULADO: { label: 'Anulado', variant: 'error' },
}

/** Pastilla del estado del documento. Se usa en el listado y en el detalle. */
export function badgeEstadoComprobante(estado: EstadoComprobante) {
  const meta = ESTADO_META[estado]
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}

/**
 * Pastilla del estado de saldo. Solo tiene valor en comprobantes REGISTRADOS;
 * en BORRADOR y ANULADO se muestra "—".
 */
export function badgeEstadoSaldo(estadoSaldo: EstadoSaldo | null) {
  if (estadoSaldo === null) {
    return <span className="text-content-muted text-sm">{SIN_DATO}</span>
  }
  return (
    <Badge variant={estadoSaldo === 'SALDADO' ? 'active' : 'inactive'}>
      {estadoSaldo === 'SALDADO' ? 'Saldado' : 'Pendiente'}
    </Badge>
  )
}

/** Opciones de los `<Select>` de filtro. `''` = sin filtro. */
export const OPCIONES_ESTADO: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'BORRADOR', label: 'Borrador' },
  { value: 'REGISTRADO', label: 'Registrado' },
  { value: 'ANULADO', label: 'Anulado' },
]

export const OPCIONES_ESTADO_SALDO: SelectOption[] = [
  { value: '', label: 'Todos los saldos' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'SALDADO', label: 'Saldado' },
]

export const OPCIONES_EFECTO_SALDO: SelectOption[] = [
  { value: '', label: 'Cualquier efecto' },
  { value: 'true', label: 'Aumenta el saldo' },
  { value: 'false', label: 'Disminuye el saldo' },
]

/** Columnas de datos del listado. La de acciones la agrega la página. */
export const COLUMNAS_COMPROBANTES: DataTableColumn<ComprobanteListItem>[] = [
  { key: 'tipo', label: 'Tipo', render: (item) => item.tipoComprobante.nombre },
  {
    key: 'numero',
    label: 'Comprobante',
    render: (item) => <span className="whitespace-nowrap">{formatearNumeroComprobante(item)}</span>,
  },
  {
    key: 'fechaEmision',
    label: 'Emisión',
    render: (item) => formatearFechaSinHora(item.fecha_emision),
  },
  {
    key: 'fechaVencimiento',
    label: 'Vencimiento',
    render: (item) => formatearFechaSinHora(item.fecha_vencimiento),
  },
  { key: 'proveedor', label: 'Proveedor', render: (item) => item.proveedor.razon_social },
  {
    key: 'importeTotal',
    label: 'Importe total',
    render: (item) => formatearMoneda(item.importe_total),
  },
  {
    key: 'saldoPendiente',
    label: 'Saldo pendiente',
    render: (item) =>
      item.saldo_pendiente === null ? SIN_DATO : formatearMoneda(item.saldo_pendiente),
  },
  { key: 'estado', label: 'Estado', render: (item) => badgeEstadoComprobante(item.estado) },
  { key: 'estadoSaldo', label: 'Saldo', render: (item) => badgeEstadoSaldo(item.estado_saldo) },
]

/** Columnas de la grilla de líneas dentro del detalle. */
export const COLUMNAS_LINEAS: DataTableColumn<LineaComprobante>[] = [
  { key: 'descripcion', label: 'Descripción', render: (linea) => linea.descripcion },
  { key: 'cantidad', label: 'Cantidad', render: (linea) => linea.cantidad },
  {
    key: 'precioUnitario',
    label: 'Precio unit.',
    render: (linea) => formatearMoneda(linea.precio_unitario),
  },
  { key: 'subtotal', label: 'Subtotal', render: (linea) => formatearMoneda(linea.subtotal) },
]
