import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Badge } from '@/shared/components/ui/Badge'
import type { Stock } from '../types/stock.types'
import { formatearCodigoStock } from '../utils/codigoStock'

/** Resultados por página del listado. Fijo por ahora: falta definir con el equipo si esto se vuelve configurable. */
export const LIMITE_PAGINA = 10

export const COLUMNAS_STOCK: DataTableColumn<Stock>[] = [
  { key: 'codigo', label: 'Código', render: (item) => formatearCodigoStock(item.id_stock) },
  { key: 'articulo', label: 'Artículo', render: (item) => item.articulo.nombre },
  { key: 'deposito', label: 'Depósito', render: (item) => item.deposito.nombre },
  {
    key: 'tipo',
    label: 'Tipo',
    render: (item) => (item.deposito.es_obrador ? 'Obrador' : 'Depósito'),
  },
  { key: 'cantidad', label: 'Cantidad', render: (item) => item.cantidad },
  { key: 'umbral_minimo', label: 'Umbral mínimo', render: (item) => item.umbral_minimo },
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
