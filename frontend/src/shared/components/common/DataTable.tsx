import type { ReactNode } from 'react'

interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  obtenerId: (item: T) => string
  rowClassName?: (item: T) => string | undefined
  loading?: boolean
  skeletonRows?: number
  emptyState?: ReactNode
  ariaLabel?: string
}

export interface DataTableColumn<T> {
  key: string
  label: string
  render: (item: T) => ReactNode
}

/**
 * Tabla de los listados.
 *
 * Props:
 * - `data`: las filas.
 * - `columns`: las columnas, con su `label` de encabezado y su `render`.
 * - `obtenerId`: devuelve la key de cada fila.
 * - `loading`: en vez de las filas muestra barras grises animadas, manteniendo
 *   los encabezados visibles. Es a propósito un skeleton dentro de la tabla y
 *   no un spinner de pantalla completa: así los filtros de arriba nunca saltan.
 * - `skeletonRows`: cuántas filas de skeleton dibujar. Default: 5.
 * - `emptyState`: qué mostrar cuando `data` viene vacío y no está cargando. Se
 *   renderiza en una fila que ocupa todas las columnas.
 * - `ariaLabel`: nombre accesible de la tabla, para los lectores de pantalla.
 */
export function DataTable<T>({
  data,
  columns,
  obtenerId,
  rowClassName,
  loading = false,
  skeletonRows = 5,
  emptyState,
  ariaLabel,
}: DataTableProps<T>) {
  return (
    <table
      aria-label={ariaLabel}
      className="bg-fondotabla w-full border-collapse text-sm shadow-md"
    >
      <thead>
        <tr className="bg-secondary text-left">
          {columns.map((column) => (
            <th key={column.key} scope="col" className="text-content px-6 py-2 font-semibold">
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody aria-busy={loading || undefined}>
        {loading ? (
          Array.from({ length: skeletonRows }, (_, indice) => (
            <tr key={`skeleton-${indice}`} className="border-subtle border-b">
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-4">
                  <span className="bg-surface-muted block h-4 w-full animate-pulse rounded" />
                </td>
              ))}
            </tr>
          ))
        ) : data.length === 0 && emptyState ? (
          <tr>
            <td colSpan={columns.length} className="px-6 py-2">
              {emptyState}
            </td>
          </tr>
        ) : (
          data.map((item) => (
            <tr
              key={obtenerId(item)}
              className={`border-subtle border-b ${rowClassName?.(item) ?? ''}`}
            >
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-2">
                  {column.render(item)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}
