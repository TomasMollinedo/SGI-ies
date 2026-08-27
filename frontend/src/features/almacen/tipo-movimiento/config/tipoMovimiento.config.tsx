import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Badge } from '@/shared/components/ui/Badge'
import type { TipoMovimiento } from '../types/tipoMovimiento.types'
import { formatearCodigoTipoMovimiento } from '../utils/codigoTipoMovimiento'

/** Resultados por página del listado. Fijo por ahora: falta definir con el equipo si esto se vuelve configurable. */
export const LIMITE_PAGINA = 10

/** Cuánto espera el buscador antes de pegarle al backend. */
export const DEBOUNCE_BUSQUEDA = 400

/** Texto de los campos opcionales que el backend devuelve en `null`. */
export const SIN_DATO = '—'

/** Etiqueta del signo del movimiento: si suma o resta stock. */
export function etiquetaIndicador(indicadorEntrada: boolean): string {
  return indicadorEntrada ? 'Entrada' : 'Salida'
}

/**
 * Las columnas de datos. La de acciones la agrega la página, porque necesita
 * sus handlers.
 */
export const COLUMNAS_TIPOS_MOVIMIENTO: DataTableColumn<TipoMovimiento>[] = [
  {
    key: 'codigo',
    label: 'Código',
    render: (item) => formatearCodigoTipoMovimiento(item.id_tipo_movimiento),
  },
  { key: 'nombre', label: 'Nombre', render: (item) => item.nombre },
  // La descripción no va en el listado: puede ser larga y se muestra completa
  // en el modal de detalle.
  {
    key: 'indicador',
    label: 'Indicador',
    render: (item) => etiquetaIndicador(item.indicador_entrada),
  },
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
