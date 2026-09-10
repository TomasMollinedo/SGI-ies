import type { DataTableColumn } from '@/shared/components/common/DataTable'
import type { SelectOption } from '@/shared/components/ui/Select'
import { Badge } from '@/shared/components/ui/Badge'
import { formatearFecha } from '@/shared/utils/fecha'
import type { CondicionSaldo, CuentaCorrienteProveedor } from '../types/cuentaCorriente.types'

/** Resultados por página del listado. Fijo, igual que en el resto de los listados. */
export const LIMITE_PAGINA = 10

export const OPCIONES_CONDICION_SALDO: SelectOption[] = [
  { value: '', label: 'Todas las condiciones' },
  { value: 'DEUDOR', label: 'Deudor' },
  { value: 'A_FAVOR', label: 'A favor' },
  { value: 'SIN_SALDO', label: 'Sin saldo' },
] satisfies { value: CondicionSaldo | ''; label: string }[]

/**
 * A diferencia del resto del proyecto, acá sin filtro el backend trae activos
 * e inactivos: un proveedor de baja puede seguir con saldo pendiente.
 */
export const OPCIONES_ESTADO: SelectOption[] = [
  { value: '', label: 'Activos e inactivos' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
]

const FORMATO_MONEDA = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })

/** Formatea un importe como pesos argentinos (ej. `3112000` → `"$ 3.112.000,00"`). */
export function formatearMoneda(valor: number): string {
  return FORMATO_MONEDA.format(valor)
}

/** El CUIT viaja sin guiones; el formato XX-XXXXXXXX-X es solo de presentación. */
export function formatearCuit(cuit: string): string {
  if (cuit.length !== 11) return cuit
  return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`
}

/**
 * El flag de vencido no lo manda el backend: se compara contra la fecha de
 * hoy acá, comparando solo el día (no la hora) para no marcar como vencido un
 * vencimiento que es hoy mismo.
 */
export function esVencido(fechaIso: string): boolean {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return new Date(fechaIso) < hoy
}

/** Positivo = la empresa debe (rojo); negativo = crédito a favor de la empresa (verde). */
export function claseSaldo(saldo: number): string {
  if (saldo > 0) return 'text-error font-medium'
  if (saldo < 0) return 'text-success font-medium'
  return 'text-content-muted'
}

export const COLUMNAS_CUENTAS_CORRIENTES: DataTableColumn<CuentaCorrienteProveedor>[] = [
  {
    key: 'proveedor',
    label: 'Proveedor',
    render: (item) => (
      <div>
        <div className="text-content font-medium">{item.razon_social}</div>
        <div className="text-content-muted text-xs">{formatearCuit(item.cuit)}</div>
      </div>
    ),
  },
  {
    key: 'estado',
    label: 'Estado',
    render: (item) => (
      <Badge variant={item.estado ? 'active' : 'inactive'}>
        {item.estado ? 'Activo' : 'Inactivo'}
      </Badge>
    ),
  },
  {
    key: 'saldo',
    label: 'Saldo',
    // Con signo: de un vistazo se ve si es deuda o crédito a favor, sin tener
    // que leer el color.
    render: (item) => (
      <span className={claseSaldo(item.saldo)}>
        {item.saldo > 0 ? '+' : item.saldo < 0 ? '−' : ''}
        {formatearMoneda(Math.abs(item.saldo))}
      </span>
    ),
  },
  {
    key: 'pendientes',
    label: 'Pend.',
    render: (item) => item.cantidad_comprobantes_pendientes,
  },
  {
    key: 'vencimiento',
    label: 'Vto. más antiguo',
    render: (item) =>
      item.vencimiento_mas_antiguo ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="whitespace-nowrap">{formatearFecha(item.vencimiento_mas_antiguo)}</span>
          {esVencido(item.vencimiento_mas_antiguo) && (
            <Badge variant="error" dot={false}>
              Vencido
            </Badge>
          )}
        </div>
      ) : (
        '—'
      ),
  },
]
