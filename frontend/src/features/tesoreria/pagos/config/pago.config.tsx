import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Badge } from '@/shared/components/ui/Badge'
import { formatearFecha } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import type { Pago } from '../types/pago.types'
import { formatearCodigoPago } from '../utils/codigoPago'

/** Resultados por página del listado. Fijo por ahora, igual que en el resto de los listados. */
export const LIMITE_PAGINA = 10

/** Cuánto espera el buscador de proveedor antes de pegarle al backend. */
export const DEBOUNCE_BUSQUEDA = 400

/** Texto de los campos opcionales que el backend devuelve en `null`. */
export const SIN_DATO = '—'

/**
 * Las columnas de datos. No hay columna de acciones: T91 es solo el listado,
 * ver el detalle o anular un pago quedan para otra tarea.
 */
export const COLUMNAS_PAGOS: DataTableColumn<Pago>[] = [
  {
    key: 'codigo',
    label: 'N.º',
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
  {
    key: 'estado',
    label: 'Estado',
    render: (item) => (
      <Badge variant={item.estado === 'CONFIRMADA' ? 'active' : 'inactive'}>
        {item.estado === 'CONFIRMADA' ? 'Confirmado' : 'Anulado'}
      </Badge>
    ),
  },
]
