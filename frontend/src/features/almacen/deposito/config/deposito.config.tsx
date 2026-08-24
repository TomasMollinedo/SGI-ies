import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Badge } from '@/shared/components/ui/Badge'
import type { Deposito } from '../types/deposito.types'

/** Resultados por página del listado. Fijo por ahora: falta definir con el equipo si esto se vuelve configurable. */
export const LIMITE_PAGINA = 10

export const COLUMNAS_DEPOSITOS: DataTableColumn<Deposito>[] = [
  { key: 'nombre', label: 'Nombre', render: (item) => item.nombre },
  { key: 'tipo', label: 'Tipo', render: (item) => (item.es_obrador ? 'Obrador' : 'Depósito') },
  { key: 'ubicacion', label: 'Ubicación', render: (item) => item.ubicacion ?? '' },
  {
    key: 'proyecto',
    label: 'Proyecto asignado',
    // Todavía no hay catálogo de proyectos para resolver un nombre: se
    // muestra el id crudo (FK_Proyecto) hasta que exista ese módulo.
    render: (item) => item.FK_Proyecto ?? '-',
  },
  {
    key: 'estado',
    label: 'Estado',
    render: (item) => (
      <Badge variant={item.estado ? 'active' : 'inactive'}>
        {item.estado ? 'Activo' : 'Dado de baja'}
      </Badge>
    ),
  },
]
