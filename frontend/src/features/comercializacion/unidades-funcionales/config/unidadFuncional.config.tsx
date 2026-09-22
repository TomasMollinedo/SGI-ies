import { formatearMoneda } from '@/features/compras/ordenes-compra/utils/formatearMoneda'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import type { SelectOption } from '@/shared/components/ui/Select'
import { Badge } from '@/shared/components/ui/Badge'
import type { UnidadFuncionalListItem } from '../types/unidadFuncional.types'

/** Resultados por página del listado. Fijo, igual que en el resto de los listados. */
export const LIMITE_PAGINA = 10

export const OPCIONES_ESTADO: SelectOption[] = [
  { value: 'true', label: 'Activas' },
  { value: 'false', label: 'Inactivas' },
  { value: 'todos', label: 'Todas' },
]

/**
 * Las columnas de datos. Recibe `obtenerLabelTipologia` porque esa columna
 * necesita traducir el `id` del enum al `code` legible del catálogo — que se
 * pidió aparte, en `useTipologias()` — para no mostrarle al usuario el valor
 * crudo del enum (ej. `TRES_DORMITORIOS`).
 */
export function crearColumnasUnidadesFuncionales(
  obtenerLabelTipologia: (id: string) => string
): DataTableColumn<UnidadFuncionalListItem>[] {
  return [
    { key: 'identificador', label: 'Identificador', render: (item) => item.identificador },
    { key: 'proyecto', label: 'Proyecto', render: (item) => item.proyecto.nombre },
    {
      key: 'tipologia',
      label: 'Tipología',
      render: (item) => obtenerLabelTipologia(item.tipologia),
    },
    {
      key: 'superficie',
      label: 'Superficie cubierta',
      render: (item) => `${item.superficie_cubierta} m²`,
    },
    { key: 'costo', label: 'Costo', render: (item) => formatearMoneda(item.costo) },
    {
      key: 'condicionEntrega',
      label: 'Condición de entrega',
      render: (item) => item.condicion_entrega.texto,
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (item) => (
        <Badge variant={item.estado ? 'active' : 'inactive'}>
          {item.estado ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
  ]
}