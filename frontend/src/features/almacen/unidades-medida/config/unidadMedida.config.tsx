import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Badge } from '@/shared/components/ui/Badge'
import type { UnidadMedida } from '../types/unidadMedida.types'

/** Resultados por página del listado. */
export const LIMITE_PAGINA = 10

export const COLUMNAS_UNIDADES_MEDIDA: DataTableColumn<UnidadMedida>[] = [
  { key: 'nombre', label: 'Nombre', render: (item) => item.nombre },
  { key: 'abreviatura', label: 'Abreviatura', render: (item) => item.abreviatura },
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
