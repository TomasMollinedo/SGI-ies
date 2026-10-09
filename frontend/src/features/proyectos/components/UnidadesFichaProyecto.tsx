import { useNavigate } from 'react-router'
import { rutaDetalleProyecto, rutaDetalleUnidadFuncional } from '@/app/router/paths'
import { SeccionPublicacion } from '@/features/comercializacion/publicaciones/components/SeccionPublicacion'
import { formatearMoneda } from '@/features/compras/ordenes-compra/utils/formatearMoneda'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { DataTable } from '@/shared/components/common/DataTable'
import { RowActions } from '@/shared/components/common/RowActions'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { Badge } from '@/shared/components/ui/Badge'
import type { UnidadFichaProyecto } from '../types/proyecto.types'
import { ESTADO_COMERCIAL_UNIDAD_META } from '../unidades-funcionales/config/unidadFuncional.config'
import { useTipologias } from '../unidades-funcionales/hooks/useUnidadesFuncionales'

interface UnidadesFichaProyectoProps {
  idProyecto: number
  /** `undefined` mientras la ficha carga. */
  unidades: UnidadFichaProyecto[] | undefined
  cargando: boolean
}

/**
 * Las unidades activas del proyecto, tal como las devuelve la ficha: todas y
 * ya ordenadas por el backend, sin filtros ni paginación (eso está en el
 * listado de Unidades Funcionales). Cada una abre su detalle.
 */
export function UnidadesFichaProyecto({
  idProyecto,
  unidades,
  cargando,
}: UnidadesFichaProyectoProps) {
  const navigate = useNavigate()

  const { data: tipologias } = useTipologias()
  const etiquetasTipologia = new Map(tipologias?.map((item) => [item.id, item.code]))

  const columnas: DataTableColumn<UnidadFichaProyecto>[] = [
    { key: 'identificador', label: 'Identificador', render: (item) => item.identificador },
    {
      key: 'tipologia',
      label: 'Tipología',
      render: (item) => etiquetasTipologia.get(item.tipologia) ?? item.tipologia,
    },
    {
      key: 'superficie',
      label: 'Superficie cubierta',
      render: (item) => `${item.superficie_cubierta} m²`,
    },
    { key: 'costo', label: 'Costo', render: (item) => formatearMoneda(item.costo) },
    {
      key: 'precioLista',
      label: 'Precio de lista',
      headerTooltip: 'Sin precio mientras la unidad está sin publicar o en preparación',
      render: (item) =>
        item.precio_lista === null ? (
          // Una publicación de datos viejos puede estar en venta sin precio
          // cargado: ahí el motivo no es que esté sin publicar.
          <span
            title={
              item.estado_comercial === 'SIN_PUBLICAR' || item.estado_comercial === 'EN_PREPARACION'
                ? 'Sin publicar o en preparación'
                : 'Sin precio de lista cargado'
            }
          >
            —
          </span>
        ) : (
          formatearMoneda(item.precio_lista)
        ),
    },
    {
      key: 'estadoComercial',
      label: 'Estado comercial',
      render: (item) => {
        const meta = ESTADO_COMERCIAL_UNIDAD_META[item.estado_comercial]
        return (
          <div className="min-w-32">
            <Badge variant={meta.variant} className="text-left whitespace-normal">
              {meta.label}
            </Badge>
          </div>
        )
      },
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (item) => (
        // Solo `onView`: `RowActions` dibuja únicamente el ojo.
        <RowActions
          isActive
          onView={() =>
            navigate(rutaDetalleUnidadFuncional(item.id_unidad_funcional), {
              // Para que el Volver de la unidad regrese a esta ficha.
              state: { volverA: rutaDetalleProyecto(idProyecto) },
            })
          }
        />
      ),
    },
  ]

  return (
    <SeccionPublicacion titulo="Unidades funcionales">
      <div className="overflow-x-auto [&>table]:min-w-[56rem]">
        <DataTable
          data={unidades ?? []}
          columns={columnas}
          obtenerId={(item) => String(item.id_unidad_funcional)}
          loading={cargando}
          skeletonRows={3}
          emptyState={
            <EmptyState titulo="Este proyecto todavía no tiene unidades funcionales activas" />
          }
          ariaLabel="Unidades funcionales del proyecto"
        />
      </div>
    </SeccionPublicacion>
  )
}
