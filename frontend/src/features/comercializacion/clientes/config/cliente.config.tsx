import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Badge } from '@/shared/components/ui/Badge'
import type { SelectOption } from '@/shared/components/ui/Select'
import { formatearImporte } from '@/shared/utils/importe'
import type { ClienteListItem, FiltroBooleano } from '../types/cliente.types'

/** Resultados por página del listado. Fijo, igual que en el resto de los listados. */
export const LIMITE_PAGINA = 10

/** Cuánto espera el buscador antes de pegarle al backend. */
export const DEBOUNCE_BUSQUEDA = 400

/** Texto de los campos que el backend devuelve en `null`. */
export const SIN_DATO = '—'

/**
 * Un solo `<Select>` de tres estados en vez de dos filtros sueltos "con
 * compras" y "sin compras", que podrían quedar marcados los dos a la vez y
 * contradecirse. `''` no manda el parámetro y trae todos.
 */
export const OPCIONES_COMPRAS: SelectOption[] = [
  { value: '', label: 'Todos los clientes' },
  { value: 'true', label: 'Con compras' },
  { value: 'false', label: 'Sin compras' },
] satisfies { value: FiltroBooleano; label: string }[]

/** Mismo criterio de tres estados que `OPCIONES_COMPRAS`. */
export const OPCIONES_MORA: SelectOption[] = [
  { value: '', label: 'En mora y al día' },
  { value: 'true', label: 'Solo en mora' },
  { value: 'false', label: 'Solo al día' },
] satisfies { value: FiltroBooleano; label: string }[]

/** Estrecha el `value` del `<select>`, que llega como `string`, al tri-estado. */
export function esFiltroBooleano(valor: string): valor is FiltroBooleano {
  return valor === '' || valor === 'true' || valor === 'false'
}

/**
 * Las columnas de datos. La de acciones la agrega la página, porque necesita
 * el `navigate` para abrir la ficha.
 *
 * Los tres indicadores (cuenta de Google, ventas vigentes, saldo y mora) los
 * calcula el backend al consultar: acá solo se muestran. El saldo se formatea
 * con `formatearImporte`, nunca con aritmética propia.
 */
export function crearColumnasClientes(): DataTableColumn<ClienteListItem>[] {
  return [
    {
      key: 'cliente',
      label: 'Cliente',
      // El backend ordena por apellido y después nombre, y no es
      // configurable: mostrar "Apellido, Nombre" hace visible ese orden en vez
      // de que el listado parezca desordenado. Sin apellido (Google no siempre
      // lo manda separado) va solo el nombre, sin coma colgando.
      headerTooltip: 'Ordenado por apellido y después nombre',
      render: (item) => (
        <p className="text-content font-medium wrap-anywhere">
          {item.apellido ? `${item.apellido}, ${item.nombre}` : item.nombre}
        </p>
      ),
    },
    {
      key: 'dniCuil',
      label: 'DNI/CUIL',
      render: (item) => item.dni_cuil ?? SIN_DATO,
    },
    {
      key: 'correo',
      label: 'Correo',
      render: (item) => <p className="text-content wrap-anywhere">{item.email}</p>,
    },
    {
      key: 'telefono',
      label: 'Teléfono',
      render: (item) => item.telefono ?? SIN_DATO,
    },
    {
      key: 'cuentaGoogle',
      label: 'Cuenta Google',
      headerTooltip: 'Si el cliente inició sesión con Google, su correo es su identidad de acceso',
      render: (item) =>
        item.tiene_cuenta_google ? (
          <Badge variant="info">Vinculada</Badge>
        ) : (
          <Badge variant="inactive">Sin vincular</Badge>
        ),
    },
    {
      key: 'ventasVigentes',
      label: 'Ventas vigentes',
      headerTooltip: 'Ventas en estado vigente; las canceladas no se cuentan',
      render: (item) => item.cantidad_ventas_vigentes,
    },
    {
      key: 'saldo',
      label: 'Saldo pendiente',
      headerTooltip: 'Suma del saldo de las cuotas no anuladas de sus ventas vigentes',
      render: (item) => (
        <p className="text-content text-xs font-medium">
          {formatearImporte(item.saldo_total_pendiente)}
        </p>
      ),
    },
    {
      key: 'mora',
      label: 'Mora',
      headerTooltip: 'En mora: al menos una cuota vencida con saldo pendiente',
      // La mora va en `error` y no en una variante neutra: es una señal que el
      // usuario tiene que poder distinguir de un estado normal. El texto del
      // badge dice qué significa, así que no depende solo del color.
      render: (item) =>
        item.en_mora ? (
          <Badge variant="error">En mora</Badge>
        ) : (
          <Badge variant="active">Al día</Badge>
        ),
    },
  ]
}
