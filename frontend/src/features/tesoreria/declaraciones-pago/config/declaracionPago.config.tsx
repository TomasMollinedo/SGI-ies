import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { etiquetaNumeroCuota } from '@/features/tesoreria/cobranzas/config/cobro.config'
import { nombreCliente } from '@/features/tesoreria/cobranzas/utils/cliente'
import { Badge } from '@/shared/components/ui/Badge'
import type { SelectOption } from '@/shared/components/ui/Select'
import { formatearFechaHora } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import type { DeclaracionPago, EstadoDeclaracionPago } from '../types/declaracionPago.types'

/** Resultados por página de la bandeja. Fijo, igual que en el resto de los listados. */
export const LIMITE_PAGINA = 10

/** Texto de los campos opcionales que el backend devuelve en `null`. */
export const SIN_DATO = '—'

/** Largo máximo del motivo de rechazo, igual que `rechazarDeclaracionPagoSchema`. */
export const MAX_MOTIVO_RECHAZO = 500

export const ESTADO_DECLARACION_LABEL: Record<EstadoDeclaracionPago, string> = {
  PENDIENTE: 'Pendiente',
  VALIDADA: 'Validada',
  RECHAZADA: 'Rechazada',
}

/** La bandeja arranca en Pendiente: es lo que Tesorería tiene que resolver. */
export const OPCIONES_ESTADO: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'VALIDADA', label: 'Validadas' },
  { value: 'RECHAZADA', label: 'Rechazadas' },
]

const VARIANTE_ESTADO = {
  PENDIENTE: 'warning',
  VALIDADA: 'active',
  RECHAZADA: 'error',
} as const

/** Pastilla del estado de la declaración. */
export function badgeEstadoDeclaracion(estado: EstadoDeclaracionPago) {
  return <Badge variant={VARIANTE_ESTADO[estado]}>{ESTADO_DECLARACION_LABEL[estado]}</Badge>
}

/** "Torre Nogal · 2-B": proyecto y unidad, como se identifica una venta en Tesorería. */
export function etiquetaUnidad(declaracion: DeclaracionPago): string {
  return `${declaracion.venta.proyecto.nombre} · ${declaracion.venta.unidad.identificador}`
}

/**
 * Los datos a cotejar contra el extracto bancario antes de validar: se
 * muestran en el diálogo de validación y en el de rechazo.
 */
export function datosACotejar(declaracion: DeclaracionPago): { label: string; value: string }[] {
  return [
    {
      label: 'Cliente',
      value: [nombreCliente(declaracion.cliente), declaracion.cliente.dni_cuil]
        .filter(Boolean)
        .join(' · '),
    },
    { label: 'Unidad', value: etiquetaUnidad(declaracion) },
    {
      label: 'Cuota',
      value: `${etiquetaNumeroCuota(declaracion.cuota.numero)} · saldo actual ${formatearImporte(declaracion.cuota.saldo_pendiente)}`,
    },
    { label: 'Importe declarado', value: formatearImporte(declaracion.importe) },
    { label: 'Forma de pago', value: declaracion.forma_pago.nombre },
    { label: 'N.º de referencia', value: declaracion.numero_referencia?.trim() || SIN_DATO },
  ]
}

/** Las columnas de datos. La de acciones la arma la página, que conoce los handlers. */
export const COLUMNAS_DECLARACIONES: DataTableColumn<DeclaracionPago>[] = [
  {
    key: 'fecha',
    label: 'Declarada',
    // `hora_creacion` es un instante real (no una fecha de negocio): se
    // muestra con hora, en horario de Argentina. Sin `whitespace-nowrap`: en
    // una columna angosta la hora baja a la segunda línea.
    render: (item) => formatearFechaHora(item.hora_creacion),
  },
  {
    key: 'cliente',
    label: 'Cliente',
    render: (item) => (
      <div className="flex flex-col">
        <span>{nombreCliente(item.cliente)}</span>
        <span className="text-content-muted text-xs">{item.cliente.dni_cuil ?? SIN_DATO}</span>
      </div>
    ),
  },
  {
    key: 'unidad',
    label: 'Unidad y cuota',
    headerTooltip: 'Proyecto y unidad; debajo, la cuota y su saldo pendiente actual',
    render: (item) => (
      <div className="flex flex-col">
        <span>{etiquetaUnidad(item)}</span>
        <span className="text-content-muted text-xs">
          Cuota {etiquetaNumeroCuota(item.cuota.numero)} · saldo{' '}
          <span className="whitespace-nowrap">{formatearImporte(item.cuota.saldo_pendiente)}</span>
        </span>
      </div>
    ),
  },
  {
    key: 'pago',
    label: 'Pago declarado',
    headerTooltip: 'Importe; debajo, la forma de pago y el número de referencia',
    render: (item) => (
      <div className="flex flex-col">
        <span className="font-semibold whitespace-nowrap">{formatearImporte(item.importe)}</span>
        <span className="text-content-muted text-xs">
          {item.forma_pago.nombre} ·{' '}
          {/* Una referencia larga sin espacios no tiene dónde cortar: se permite partirla. */}
          <span className="break-all">{item.numero_referencia ?? SIN_DATO}</span>
        </span>
      </div>
    ),
  },
  { key: 'estado', label: 'Estado', render: (item) => badgeEstadoDeclaracion(item.estado) },
]
