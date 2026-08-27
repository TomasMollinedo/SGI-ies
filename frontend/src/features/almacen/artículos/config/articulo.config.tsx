import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Badge } from '@/shared/components/ui/Badge'
import type { Articulo } from '../types/articulo.types'

/** Resultados por página del listado. Fijo por ahora: falta definir con el equipo si esto se vuelve configurable. */
export const LIMITE_PAGINA = 10

/** Cuánto espera el buscador antes de pegarle al backend. */
export const DEBOUNCE_BUSQUEDA = 400

/**
 * Las columnas de datos. La de acciones la agrega la página, porque necesita
 * sus handlers.
 */
export const COLUMNAS_ARTICULOS: DataTableColumn<Articulo>[] = [
  { key: 'codigo', label: 'Código', render: (item) => item.codigo },
  { key: 'nombre', label: 'Nombre', render: (item) => item.nombre },
  { key: 'categoria', label: 'Categoría', render: (item) => item.categoria.nombre },
  { key: 'marca', label: 'Marca', render: (item) => item.marca?.nombre ?? '—' },
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
    key: 'unidadMedida',
    label: 'U. de Medida',
    render: (item) => item.unidadMedida.abreviatura,
  },
]
