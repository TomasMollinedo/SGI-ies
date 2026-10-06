import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Badge } from '@/shared/components/ui/Badge'
import type { PlazoFinanciacion } from '../types/plazoFinanciacion.types'
import { DECIMALES_TASA_MENSUAL, DECIMALES_TNA, formatearTasa } from '../utils/tasa'

/** Resultados por página del listado. Fijo por ahora, igual que en el resto de los listados. */
export const LIMITE_PAGINA = 10

/**
 * Máximo de cuotas que admite el backend (`MAX_CANTIDAD_CUOTAS` en
 * create-plazo-financiacion.dto.ts). Si cambia allá, se cambia acá.
 */
export const MAX_CANTIDAD_CUOTAS = 60

/** Texto de los campos opcionales que el backend devuelve en `null`. */
export const SIN_DATO = '—'

/**
 * Las columnas de datos. La de acciones la agrega la página, porque necesita
 * sus handlers. El orden por cantidad de cuotas lo resuelve el backend.
 */
export const COLUMNAS_PLAZOS_FINANCIACION: DataTableColumn<PlazoFinanciacion>[] = [
  { key: 'codigo', label: 'Código', render: (item) => item.codigo },
  { key: 'cuotas', label: 'Cuotas', render: (item) => item.cantidad_cuotas },
  {
    key: 'tna',
    label: 'TNA',
    render: (item) => formatearTasa(item.tasa_nominal_anual, DECIMALES_TNA),
  },
  {
    key: 'tasaMensual',
    label: 'Tasa mensual',
    headerTooltip: 'TNA ÷ 12: la tasa que usa el cálculo de cuotas',
    render: (item) => formatearTasa(item.tasa_mensual, DECIMALES_TASA_MENSUAL),
  },
  {
    key: 'descripcion',
    label: 'Descripción',
    // Puede tener hasta 255 caracteres: se corta con "…" para no deformar la
    // tabla, y el texto completo queda en el tooltip y en el modo lectura.
    render: (item) => {
      const descripcion = item.descripcion?.trim()

      return (
        <span className="block max-w-xs truncate" title={descripcion || undefined}>
          {descripcion || SIN_DATO}
        </span>
      )
    },
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
