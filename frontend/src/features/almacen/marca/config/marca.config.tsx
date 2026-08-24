import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Badge } from '@/shared/components/ui/Badge'
import type { Marca } from '../types/marca.types'

/** Resultados por página del listado. Fijo por ahora: falta definir con el equipo si esto se vuelve configurable. */
export const LIMITE_PAGINA = 10

/** Cuánto espera el buscador antes de pegarle al backend. */
export const DEBOUNCE_BUSQUEDA = 400

/**
 * Las columnas de datos. La de acciones la agrega la página, porque necesita
 * sus handlers.
 */
export const COLUMNAS_MARCAS: DataTableColumn<Marca>[] = [
  { key: 'codigo', label: 'Código', render: (item) => `MAR-${item.id_marca}` },
  { key: 'nombre', label: 'Nombre de la Marca', render: (item) => item.nombre },
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
