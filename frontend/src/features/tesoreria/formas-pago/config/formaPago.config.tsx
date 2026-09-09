import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Badge } from '@/shared/components/ui/Badge'
import type { FormaPago } from '../types/formaPago.types'
import { formatearCodigoFormaPago } from '../utils/codigoFormaPago'

/** Resultados por página del listado. Fijo por ahora, igual que en el resto de los listados. */
export const LIMITE_PAGINA = 10

/** Cuánto espera el buscador antes de pegarle al backend. */
export const DEBOUNCE_BUSQUEDA = 400

/** Texto de los campos opcionales que el backend devuelve en `null`. */
export const SIN_DATO = '—'

/**
 * Las columnas de datos. La de acciones la agrega la página, porque necesita
 * sus handlers.
 */
export const COLUMNAS_FORMAS_PAGO: DataTableColumn<FormaPago>[] = [
  {
    key: 'codigo',
    label: 'Código',
    render: (item) => formatearCodigoFormaPago(item.id_forma_pago),
  },
  { key: 'nombre', label: 'Nombre', render: (item) => item.nombre },
  // La descripción no va en el listado: puede ser larga y se muestra completa
  // en el modal de detalle.
  {
    key: 'requiereReferencia',
    label: 'Requiere referencia',
    render: (item) => (item.requiere_referencia ? 'Sí' : 'No'),
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
