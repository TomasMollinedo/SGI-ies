import type { DataTableColumn } from '@/shared/components/common/DataTable'
import type { SelectOption } from '@/shared/components/ui/Select'
import { Badge } from '@/shared/components/ui/Badge'
import type { FiltroEstado, Proveedor } from '../types/proveedor.types'

/** Resultados por página del listado. Fijo por ahora, igual que en el resto de los listados. */
export const LIMITE_PAGINA = 10

/** Cuánto espera el buscador antes de pegarle al backend. */
export const DEBOUNCE_BUSQUEDA = 400

/**
 * A diferencia del resto de los listados, acá "todos" es un valor que se
 * manda tal cual al backend: sin parámetro de estado solo trae los activos.
 */
export const OPCIONES_ESTADO: SelectOption[] = [
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
  { value: 'todos', label: 'Todos' },
] satisfies { value: FiltroEstado; label: string }[]

/**
 * Las columnas de datos. Recibe `obtenerCodigoCondicionIva` porque esa columna
 * necesita traducir el `id` de la fila al `code` del catálogo — que se pidió
 * aparte, en `useCondicionesIva()` — para no mostrarle al usuario el id crudo.
 */
export function crearColumnasProveedores(
  obtenerCodigoCondicionIva: (id: string) => string
): DataTableColumn<Proveedor>[] {
  return [
    { key: 'razonSocial', label: 'Razón Social', render: (item) => item.razon_social },
    { key: 'cuit', label: 'CUIT', render: (item) => item.cuit },
    {
      key: 'condicionIva',
      label: 'Condición IVA',
      render: (item) => obtenerCodigoCondicionIva(item.condicion_iva),
    },
    { key: 'telefono', label: 'Teléfono', render: (item) => item.telefono || '—' },
    {
      key: 'estado',
      label: 'Estado',
      render: (item) => (
        <Badge variant={item.estado ? 'active' : 'inactive'}>
          {item.estado ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
  ]
}
