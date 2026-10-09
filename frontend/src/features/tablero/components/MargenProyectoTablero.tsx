import { DataTable } from '@/shared/components/common/DataTable'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import { Spinner } from '@/shared/components/ui/Spinner'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { cn } from '@/shared/utils/cn'
import type {
  MargenProyectoItem,
  MargenProyectoResponse,
  MargenTablero,
} from '../types/tablero.types'
import {
  claseColorResultado,
  formatearImporteConSigno,
  formatearPorcentaje,
} from '../utils/formato'

interface MargenProyectoTableroProps {
  /** `undefined` mientras todavía no llegó. */
  margen?: MargenProyectoResponse
  cargando: boolean
  error: ApiErrorResponse | null
  /** Hay un pedido en curso y lo que se ve es la página anterior: bloquea la paginación. */
  actualizando: boolean
  /** Si la pantalla tiene un proyecto elegido; solo cambia el mensaje de lista vacía. */
  tieneFiltroProyecto: boolean
  onPaginaChange: (pagina: number) => void
}

const TOOLTIP_PORCENTAJE = 'El porcentaje es sobre las ventas: margen ÷ precio'

const COLUMNAS: DataTableColumn<MargenProyectoItem>[] = [
  {
    key: 'proyecto',
    label: 'Proyecto',
    render: (item) => (
      <div className="min-w-0">
        <p className="text-content font-medium wrap-anywhere">{item.proyecto.nombre}</p>
        <p className="text-content-muted text-xs">{item.proyecto.codigo}</p>
      </div>
    ),
  },
  {
    key: 'unidades',
    label: 'Unidades vendidas',
    headerTooltip: 'Unidades con venta vigente, sobre las unidades activas del proyecto',
    render: (item) => (
      <div className="whitespace-nowrap">
        <p className="text-content">
          {item.unidades_vendidas} de {item.unidades_activas}
        </p>
        <p className="text-content-muted text-xs">
          {formatearPorcentaje(item.porcentaje_vendidas)} vendido
        </p>
      </div>
    ),
  },
  {
    key: 'realizado',
    label: 'Margen realizado',
    headerTooltip: `Unidades con venta vigente: precio de venta − costo. ${TOOLTIP_PORCENTAJE} de venta`,
    render: (item) => <CeldaMargen margen={item.margen_realizado} />,
  },
  {
    key: 'proyectado',
    label: 'Margen proyectado',
    headerTooltip: `Unidades Disponibles: precio de lista − costo. ${TOOLTIP_PORCENTAJE} de lista`,
    render: (item) => <CeldaMargen margen={item.margen_proyectado} />,
  },
  {
    key: 'total',
    label: 'Margen total esperado',
    headerTooltip: 'Margen realizado + margen proyectado',
    render: (item) => (
      <p
        className={cn(
          'font-semibold whitespace-nowrap',
          claseColorResultado(item.margen_total_esperado)
        )}
      >
        {formatearImporteConSigno(item.margen_total_esperado)}
      </p>
    ),
  },
  {
    key: 'fueraDeCalculo',
    label: 'Fuera del cálculo',
    headerTooltip:
      'Unidades activas que no entran en ningún margen: sin publicación vigente, o con la publicación En preparación (todavía sin precio de lista)',
    render: (item) => item.unidades_fuera_de_calculo,
  },
]

/**
 * Margen comercial de cada proyecto activo, a la fecha: realizado (lo ya
 * vendido), proyectado (lo Disponible) y total esperado. Tiene su propia
 * consulta y sus propios estados: si falla, el resto del tablero sigue.
 *
 * El filtro por proyecto, el orden (del proyecto más reciente al más antiguo,
 * por fecha de inicio o, si no la tiene, por fecha de alta) y la paginación los resuelve el backend: acá solo se muestra la página que
 * llegó. El total de unidades fuera del cálculo también viene calculado, sobre
 * todos los proyectos y no solo los de la página.
 *
 * Los proyectos sin nada publicado se listan igual, con sus ceros y su conteo
 * de unidades fuera del cálculo: es justo lo que el gerente tiene que notar.
 */
export function MargenProyectoTablero({
  margen,
  cargando,
  error,
  actualizando,
  tieneFiltroProyecto,
  onPaginaChange,
}: MargenProyectoTableroProps) {
  const filas = margen?.data ?? []

  return (
    <section
      aria-label="Margen por proyecto, a la fecha"
      className="bg-fondotabla border-subtle rounded-lg border p-4 shadow-md"
    >
      <h2 className="text-content text-base font-semibold">Margen por proyecto, a la fecha</h2>
      <p className="text-content-muted mt-1 text-xs">
        No depende del rango de fechas elegido: se calcula con las ventas vigentes y las unidades
        Disponibles de hoy.
      </p>
      <p className="text-content-muted mt-1 mb-3 text-xs">
        Los proyectos se ordenan del más reciente al más antiguo, por fecha de inicio; los que no la
        tienen cargada, por su fecha de alta en el sistema.
      </p>

      {cargando && (
        <div className="flex justify-center py-8">
          <Spinner className="text-primary size-6" />
        </div>
      )}

      {!cargando && error && (
        <p role="alert" className="text-error py-8 text-center text-sm">
          No se pudo cargar el margen por proyecto: {formatearMensajeError(error.message)}
        </p>
      )}

      {!cargando && !error && margen && filas.length === 0 && (
        <p className="text-content-muted py-8 text-center text-sm">
          {tieneFiltroProyecto
            ? 'El proyecto seleccionado no está entre los proyectos activos.'
            : 'No hay proyectos activos.'}
        </p>
      )}

      {!cargando && !error && margen && filas.length > 0 && (
        <>
          {/* El scroll horizontal, si hace falta en pantallas angostas, queda adentro de la sección. */}
          <div className="overflow-x-auto">
            <DataTable
              data={filas}
              columns={COLUMNAS}
              obtenerId={(item) => String(item.proyecto.id_proyecto)}
              ariaLabel="Margen por proyecto, a la fecha"
            />
          </div>

          <Pagination
            className="mt-3"
            currentPage={margen.meta.page}
            totalPages={Math.max(1, Math.ceil(margen.meta.total / margen.meta.limit))}
            totalItems={margen.meta.total}
            pageSize={margen.meta.limit}
            onPageChange={onPaginaChange}
            disabled={actualizando}
          />

          <p className="text-content-muted mt-3 text-xs">
            <span className="text-content font-semibold">
              Unidades fuera del cálculo: {margen.total_unidades_fuera_de_calculo} en total.
            </span>{' '}
            Son las unidades activas sin publicación vigente o con la publicación En preparación,
            que todavía no tienen precio de lista: el margen no las cubre.
          </p>
        </>
      )}
    </section>
  )
}

/** Importe con el signo en el texto (el color solo acompaña) y su porcentaje sobre las ventas. */
function CeldaMargen({ margen }: { margen: MargenTablero }) {
  return (
    <div className="whitespace-nowrap">
      <p className={cn('font-medium', claseColorResultado(margen.importe))}>
        {formatearImporteConSigno(margen.importe)}
      </p>
      <p className="text-content-muted text-xs">
        {formatearPorcentaje(margen.porcentaje)} sobre ventas
      </p>
    </div>
  )
}
