import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Badge } from '@/shared/components/ui/Badge'
import { formatearImporte } from '@/shared/utils/importe'
import type {
  EstadoCobro,
  LineaCobro,
  OrigenCobro,
  UsuarioResumenCobro,
} from '../types/cobro.types'

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
