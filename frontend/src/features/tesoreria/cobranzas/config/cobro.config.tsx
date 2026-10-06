import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Badge } from '@/shared/components/ui/Badge'
import { formatearFecha } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import type {
  CobroListItem,
  EstadoCobro,
  LineaCobro,
  OrigenCobro,
  UsuarioResumenCobro,
} from '../types/cobro.types'
import { nombreCliente } from '../utils/cliente'
import { formatearCodigoCobro } from '../utils/codigoCobro'

/** Resultados por página del listado. Fijo, igual que en el resto de los listados. */
export const LIMITE_PAGINA = 10

/** Texto de los campos opcionales que el backend devuelve en `null`. */
export const SIN_DATO = '—'

export function textoOSinDato(valor: string | null | undefined): string {
  return valor?.trim() || SIN_DATO
}

export function nombreUsuario(usuario: UsuarioResumenCobro | null | undefined): string {
  if (!usuario) return SIN_DATO
  return `${usuario.nombre} ${usuario.apellido}`
}

export const ORIGEN_COBRO_LABEL: Record<OrigenCobro, string> = {
  PRESENCIAL: 'Presencial',
  ECOMMERCE: 'Ecommerce',
}

/** Mismo criterio que el cronograma de `VentaDetallePage`: la cuota 0 es el anticipo. */
export function etiquetaNumeroCuota(numero: number): string {
  return numero === 0 ? 'Anticipo' : `#${numero}`
}

/** Pastilla del estado del cobro. */
export function badgeEstadoCobro(estado: EstadoCobro) {
  return (
    <Badge variant={estado === 'CONFIRMADO' ? 'active' : 'inactive'}>
      {estado === 'CONFIRMADO' ? 'Confirmado' : 'Anulado'}
    </Badge>
  )
}

/**
 * Columnas de datos del listado de cobros: una por dato, igual que
 * `COLUMNAS_PAGOS`. No hay columna de acciones: la arma `CobranzasPage`, que
 * es quien conoce la navegación y el modal de anulación.
 */
export const COLUMNAS_COBROS: DataTableColumn<CobroListItem>[] = [
  {
    key: 'codigo',
    label: 'Código',
    render: (item) => (
      <span className="whitespace-nowrap">{formatearCodigoCobro(item.id_cobro)}</span>
    ),
  },
  {
    key: 'fecha',
    label: 'Fecha',
    // `fecha_cobro` no siempre es medianoche: los cobros ECOMMERCE y los
    // registrados sin fecha llevan la hora real. Por eso `formatearFecha`
    // (convierte a hora de Argentina) y no `formatearFechaSinHora`.
    render: (item) => formatearFecha(item.fecha_cobro),
  },
  { key: 'cliente', label: 'Cliente', render: (item) => nombreCliente(item.cliente) },
  { key: 'formaPago', label: 'Forma de pago', render: (item) => item.formaPago.nombre },
  {
    key: 'referencia',
    label: 'N.º de referencia',
    render: (item) => textoOSinDato(item.numero_referencia),
  },
  { key: 'origen', label: 'Origen', render: (item) => ORIGEN_COBRO_LABEL[item.origen] },
  {
    key: 'importe',
    label: 'Importe',
    render: (item) => (
      <span className="whitespace-nowrap">{formatearImporte(item.importe_total)}</span>
    ),
  },
  { key: 'estado', label: 'Estado', render: (item) => badgeEstadoCobro(item.estado) },
]

/**
 * Columnas de las imputaciones en el detalle de un cobro. `saldo_anterior` y
 * `saldo_posterior` se muestran tal como vienen del backend: son la foto al
 * confirmar y no se recalculan (ni siquiera si el cobro se anuló).
 */
export const COLUMNAS_DETALLE_COBRO: DataTableColumn<LineaCobro>[] = [
  { key: 'unidad', label: 'Unidad', render: (linea) => linea.cuota.venta.unidad.identificador },
  { key: 'cuota', label: 'Cuota', render: (linea) => etiquetaNumeroCuota(linea.cuota.numero) },
  {
    key: 'importeImputado',
    label: 'Importe imputado',
    render: (linea) => (
      <span className="whitespace-nowrap">{formatearImporte(linea.importe_imputado)}</span>
    ),
  },
  {
    key: 'saldoAnterior',
    label: 'Saldo anterior',
    render: (linea) => (
      <span className="whitespace-nowrap">{formatearImporte(linea.saldo_anterior)}</span>
    ),
  },
  {
    key: 'saldoPosterior',
    label: 'Saldo posterior',
    render: (linea) => (
      <span className="whitespace-nowrap">{formatearImporte(linea.saldo_posterior)}</span>
    ),
  },
]
