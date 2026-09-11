import { TrendingDown, TrendingUp } from 'lucide-react'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { formatearNumeroComprobante } from '@/features/tesoreria/comprobantes/utils/numeroComprobante'
import type { TipoComprobante } from '@/features/tesoreria/tipos-comprobante/types/tipoComprobante.types'
import { Badge } from '@/shared/components/ui/Badge'
import { formatearFechaSinHora } from '@/shared/utils/fecha'
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
    // Fecha de negocio (cuándo se pagó): viaja como medianoche UTC, así que
    // no se convierte de zona horaria (ver `formatearFechaSinHora`).
    render: (item) => formatearFechaSinHora(item.fecha_pago),
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

/**
 * Pastilla Debe/Haber de una línea de imputación: si el tipo de comprobante
 * aumenta el saldo (factura, va al HABER) o lo disminuye (nota de crédito,
 * va al DEBE) — mismo criterio y estilo que la tabla de comprobantes
 * imputables al emitir un pago (ver `NuevoPagoPage`) y que el cardex de
 * cuenta corriente: la cuenta es un pasivo, aumenta por el HABER (en rojo,
 * de alerta) y disminuye por el DEBE (en verde). `undefined` es "no se pudo
 * determinar" (el tipo de comprobante no está en el catálogo cargado).
 */
export function badgeEfectoSaldo(aumentaSaldo: boolean | undefined) {
  if (aumentaSaldo === undefined) return SIN_DATO

  return (
    <Badge variant={aumentaSaldo ? 'error' : 'active'} dot={false}>
      {aumentaSaldo ? (
        <TrendingUp className="size-3.5" aria-hidden="true" />
      ) : (
        <TrendingDown className="size-3.5" aria-hidden="true" />
      )}
      {aumentaSaldo ? 'Haber' : 'Debe'}
    </Badge>
  )
}

/** Nombre del tipo + letra del comprobante (ej. "Factura A"), para no tener que cruzar con la columna del número para saber la letra. */
export function formatearTipoComprobante(nombreTipo: string, letra: string): string {
  return `${nombreTipo} ${letra}`
}

/**
 * Columnas de la grilla de imputaciones dentro del detalle de un pago.
 * `tiposComprobantePorId` viene del catálogo de tipos de comprobante (no
 * incluido en la respuesta de un comprobante imputado): se arma una sola vez
 * en `PagoDetalleModal` y se cruza acá por `FK_tipo_comprobante`.
 */
export function columnasDetallePago(
  tiposComprobantePorId: Map<number, TipoComprobante>
): DataTableColumn<LineaPago>[] {
  return [
    {
      key: 'efecto',
      label: 'Efecto',
      render: (linea) =>
        badgeEfectoSaldo(
          tiposComprobantePorId.get(linea.comprobante.FK_tipo_comprobante)?.aumenta_saldo
        ),
    },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (linea) => {
        const tipo = tiposComprobantePorId.get(linea.comprobante.FK_tipo_comprobante)
        return tipo ? formatearTipoComprobante(tipo.nombre, linea.comprobante.letra) : SIN_DATO
      },
    },
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
}
