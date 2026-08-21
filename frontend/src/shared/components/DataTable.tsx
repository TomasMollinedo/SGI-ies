interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  obtenerId: (item: T) => string
}

export interface DataTableColumn<T> {
  key: string
  label: string
  render: (item: T) => string
}

export function DataTable<T>({ data, columns, obtenerId }: DataTableProps<T>) {
  return (
    <table className="bg-fondotabla w-full border-collapse text-sm">
      <thead>
        <tr className="bg-secondary text-left">
          {columns.map((column) => (
            <th key={column.key} className="text-content px-6 py-2 font-semibold">
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr key={obtenerId(item)} className="border-subtle border-b">
            {columns.map((column) => (
              <td key={column.key} className="px-6 py-2">
                {column.render(item)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
