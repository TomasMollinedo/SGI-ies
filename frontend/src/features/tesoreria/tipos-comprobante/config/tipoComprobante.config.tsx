import { TrendingDown, TrendingUp } from 'lucide-react'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Badge } from '@/shared/components/ui/Badge'
import type { TipoComprobante } from '../types/tipoComprobante.types'
import { formatearCodigoTipoComprobante } from '../utils/codigoTipoComprobante'

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
export const COLUMNAS_TIPOS_COMPROBANTE: DataTableColumn<TipoComprobante>[] = [
  {
    key: 'codigo',
    label: 'Código',
    render: (item) => formatearCodigoTipoComprobante(item.id_tipo_comprobante),
  },
  { key: 'nombre', label: 'Nombre', render: (item) => item.nombre },
  // La descripción no va en el listado: puede ser larga y se muestra completa
  // en el modal de detalle.
  {
    key: 'efectoSaldo',
    label: 'Efecto sobre el saldo',
    // No alcanza con el color: se suma un ícono y el texto "Aumenta"/
    // "Disminuye" para que se distinga sin depender de la percepción cromática.
    render: (item) => (
      <Badge variant={item.aumenta_saldo ? 'active' : 'error'} dot={false}>
        {item.aumenta_saldo ? (
          <TrendingUp className="size-3.5" aria-hidden="true" />
        ) : (
          <TrendingDown className="size-3.5" aria-hidden="true" />
        )}
        {item.aumenta_saldo ? 'Aumenta' : 'Disminuye'}
      </Badge>
    ),
  },
  {
    key: 'requiereOrigen',
    label: 'Requiere origen',
    render: (item) => (item.requiere_comprobante_origen ? 'Sí' : 'No'),
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
