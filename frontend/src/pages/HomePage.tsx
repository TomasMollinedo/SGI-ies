import { DataTable, type DataTableColumn } from '@/shared/components/common/DataTable'

interface Articulo {
  codigo: string
  nombre: string
  estado: string
}

const articulosDePrueba: Articulo[] = [
  { codigo: 'HOR-0014', nombre: 'Hormigón elaborado H-21', estado: 'Activo' },
  { codigo: 'HOR-0015', nombre: 'Hormigón elaborado H-21', estado: 'Inactivo' },
]

const columnas: DataTableColumn<Articulo>[] = [
  { key: 'codigo', label: 'Código', render: (articulo) => articulo.codigo },
  { key: 'nombre', label: 'Nombre', render: (articulo) => articulo.nombre },
  { key: 'estado', label: 'Estado', render: (articulo) => articulo.estado },
]

export function HomePage() {
  return (
    <section className="space-y-2">
      <h1 className="text-content text-2xl font-semibold">SGI IES Constructora</h1>
      <p className="text-content-muted text-sm">Sistema de gestión integral.</p>

      <DataTable
        data={articulosDePrueba}
        columns={columnas}
        obtenerId={(articulo) => articulo.codigo}
      />
    </section>
  )
}
