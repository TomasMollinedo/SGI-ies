import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Badge } from '@/shared/components/ui/Badge'
import type { Categoria } from '../types/categoria.types'
import { formatearCodigoCategoria } from '../utils/codigoCategoria'


/** Resultados por página del listado. Fijo por ahora: falta definir con el equipo si esto se vuelve configurable. */
export const LIMITE_PAGINA = 10

export const COLUMNAS_CATEGORIAS: DataTableColumn<Categoria>[] = [
  { key: 'id_categoria', label: 'Código', render: (item) => formatearCodigoCategoria(item.id_categoria) },

  { key: 'nombre', label: 'Nombre', render: (item) => item.nombre },
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
