import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Badge } from '@/shared/components/ui/Badge'
import type { BadgeVariant } from '@/shared/components/ui/Badge'
import type { SelectOption } from '@/shared/components/ui/Select'
import { formatearFechaSinHora } from '@/shared/utils/fecha'
import type {
  DetalleOrdenCompra,
  EstadoOrdenCompra,
  OrdenCompraListItem,
} from '../types/ordenCompra.types'
import { formatearCodigoOrdenCompra } from '../utils/codigoOrdenCompra'
import { formatearMoneda } from '../utils/formatearMoneda'

/** Resultados por página del listado. Fijo, igual que el resto de los listados. */
export const LIMITE_PAGINA = 10

const ESTADO_META: Record<EstadoOrdenCompra, { label: string; variant: BadgeVariant }> = {
  BORRADOR: { label: 'Borrador', variant: 'inactive' },
  EMITIDA: { label: 'Emitida', variant: 'active' },
  RECIBIDA_PARCIAL: { label: 'Recibida parcial', variant: 'active' },
  RECIBIDA: { label: 'Recibida', variant: 'active' },
  CANCELADA: { label: 'Cancelada', variant: 'error' },
}

/** Pastilla del estado de la orden. Se usa en el listado y en el detalle. */
export function badgeEstadoOrdenCompra(estado: EstadoOrdenCompra) {
  const meta = ESTADO_META[estado]
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}

/** Opciones del `<Select>` de filtro por estado. `''` = todos los estados. */
export const OPCIONES_ESTADO: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'BORRADOR', label: 'Borrador' },
  { value: 'EMITIDA', label: 'Emitida' },
  { value: 'RECIBIDA_PARCIAL', label: 'Recibida parcial' },
  { value: 'RECIBIDA', label: 'Recibida' },
  { value: 'CANCELADA', label: 'Cancelada' },
]

/** Columnas de datos del listado. La de acciones la agrega la página. */
export const COLUMNAS_ORDENES_COMPRA: DataTableColumn<OrdenCompraListItem>[] = [
  {
    key: 'numero',
    label: 'Número',
    render: (item) => (
      <span className="whitespace-nowrap">{formatearCodigoOrdenCompra(item.id_orden_compra)}</span>
    ),
  },
  {
    key: 'fechaEmision',
    label: 'Fecha de emisión',
    render: (item) => formatearFechaSinHora(item.fecha_emision),
  },
  { key: 'proveedor', label: 'Proveedor', render: (item) => item.proveedor.razon_social },
  { key: 'deposito', label: 'Depósito de destino', render: (item) => item.deposito.nombre },
  {
    key: 'importeTotal',
    label: 'Importe total',
    render: (item) => formatearMoneda(item.total),
  },
  { key: 'estado', label: 'Estado', render: (item) => badgeEstadoOrdenCompra(item.estado) },
]

/** Columnas de la grilla de líneas dentro del detalle. */
export const COLUMNAS_LINEAS: DataTableColumn<DetalleOrdenCompra>[] = [
  { key: 'articulo', label: 'Artículo', render: (linea) => linea.articulo.nombre },
  { key: 'cantidad', label: 'Cantidad', render: (linea) => linea.cantidad },
  {
    key: 'precioUnitario',
    label: 'Precio unit.',
    render: (linea) => formatearMoneda(linea.precio_unitario),
  },
  { key: 'subtotal', label: 'Subtotal', render: (linea) => formatearMoneda(linea.subtotal) },
]
