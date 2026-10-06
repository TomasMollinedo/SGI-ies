import { formatearMoneda } from '@/features/compras/ordenes-compra/utils/formatearMoneda'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import type { SelectOption } from '@/shared/components/ui/Select'
import { Badge } from '@/shared/components/ui/Badge'
import {
  CLASES_BADGE_MOBILE,
  ESTADO_COMERCIAL_META,
} from '@/features/comercializacion/publicaciones/config/publicacion.config'
import type { BadgeVariant } from '@/shared/components/ui/Badge'
import type { EstadoComercialUnidad, UnidadFuncionalListItem } from '../types/unidadFuncional.types'

/** Resultados por página del listado. Fijo, igual que en el resto de los listados. */
export const LIMITE_PAGINA = 10

/**
 * Estados de la publicación (mismos labels y colores que en Publicaciones) más
 * `SIN_PUBLICAR`, que es una unidad sin publicación vigente: no es un estado
 * de la publicación sino su ausencia, por eso va en gris como "inactivo".
 */
const ESTADO_COMERCIAL_UNIDAD_META: Record<
  EstadoComercialUnidad,
  { label: string; variant: BadgeVariant }
> = {
  SIN_PUBLICAR: { label: 'Sin publicar', variant: 'inactive' },
  ...ESTADO_COMERCIAL_META,
}

/** Opciones del `<Select>` de estado comercial. `''` = todos. */
export const OPCIONES_ESTADO_COMERCIAL: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  ...(
    Object.entries(ESTADO_COMERCIAL_UNIDAD_META) as [EstadoComercialUnidad, { label: string }][]
  ).map(([value, meta]) => ({ value, label: meta.label })),
]

export function esEstadoComercialUnidad(valor: string): valor is EstadoComercialUnidad {
  return valor in ESTADO_COMERCIAL_UNIDAD_META
}

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
      key: 'estadoComercial',
      label: 'Estado comercial',
      render: (item) => {
        const meta = ESTADO_COMERCIAL_UNIDAD_META[item.estado_comercial]
        return (
          <Badge variant={meta.variant} className={CLASES_BADGE_MOBILE}>
            {meta.label}
          </Badge>
        )
      },
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
