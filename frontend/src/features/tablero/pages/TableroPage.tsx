import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Info, ShieldAlert } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/ui/Spinner'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { finDelDiaIso, inicioDelDiaIso } from '@/shared/utils/fechaIso'
import { EvolucionTablero } from '../components/EvolucionTablero'
import { FiltrosTableroBar } from '../components/FiltrosTableroBar'
import { IndicadoresTablero } from '../components/IndicadoresTablero'
import { MargenProyectoTablero } from '../components/MargenProyectoTablero'
import { RankingTablero } from '../components/RankingTablero'
import { AGRUPACION_INICIAL, MARGEN_PROYECTOS_POR_PAGINA } from '../config/tablero.config'
import { useIngresosEgresos, useIngresosPorCliente, useMargenProyecto } from '../hooks/useTablero'
import type { Agrupacion } from '../types/tablero.types'
import { rankingProyectos } from '../utils/ranking'

/** Primer y último día del año en curso, en formato `YYYY-MM-DD` (lo que usa un `<input type="date">`). */
function anioEnCurso(): { desde: string; hasta: string } {
  const anio = new Date().getFullYear()
  return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` }
}

/**
 * Tablero del Gerente General: cómo viene la empresa. Indicadores del rango
 * (con su variación contra el rango anterior), evolución de ingresos y
 * egresos por período, reparto de los ingresos por proyecto y por cliente, y
 * margen comercial de cada proyecto. Por defecto, el año en curso agrupado por
 * mes y sin proyecto. Es de solo lectura: todo se calcula en el backend al
 * consultar.
 *
 * El filtro por proyecto se aplica distinto a cada cosa. A los ingresos viaja
 * al backend como `FK_proyecto`, y al margen también (su tabla además viene
 * paginada desde el backend). Los dos rankings, en cambio, se ocultan: el de clientes sale de `GET /cobros`, que no filtra
 * por proyecto, así que mostraría totales de toda la empresa al lado de
 * ingresos de un solo proyecto; el de proyectos quedaría en una fila al 100 %.
 */
export function TableroPage() {
  const navigate = useNavigate()

  const [agrupacion, setAgrupacion] = useState<Agrupacion>(AGRUPACION_INICIAL)
  const [fechaDesde, setFechaDesde] = useState(() => anioEnCurso().desde)
  const [fechaHasta, setFechaHasta] = useState(() => anioEnCurso().hasta)
  const [proyecto, setProyecto] = useState('')
  const [paginaMargen, setPaginaMargen] = useState(1)

  const inicial = anioEnCurso()
  const hayCambios =
    agrupacion !== AGRUPACION_INICIAL ||
    fechaDesde !== inicial.desde ||
    fechaHasta !== inicial.hasta ||
    proyecto !== ''

  function restablecer() {
    const rango = anioEnCurso()
    setAgrupacion(AGRUPACION_INICIAL)
    setFechaDesde(rango.desde)
    setFechaHasta(rango.hasta)
    cambiarProyecto('')
  }

  // Otro proyecto es otra lista: la página en la que estaba ya no significa nada.
  function cambiarProyecto(valor: string) {
    setProyecto(valor)
    setPaginaMargen(1)
  }

  const fechasCompletas = fechaDesde !== '' && fechaHasta !== ''
  const rangoInvalido = fechasCompletas && fechaDesde > fechaHasta

  const idProyecto = proyecto === '' ? null : Number(proyecto)
  const tieneFiltroProyecto = idProyecto !== null

  const filtros =
    fechasCompletas && !rangoInvalido
      ? {
          agrupacion,
          fechaDesde: inicioDelDiaIso(fechaDesde),
          fechaHasta: finDelDiaIso(fechaHasta),
        }
      : null

  const { data, isLoading, error, refetch } = useIngresosEgresos(
    filtros && tieneFiltroProyecto ? { ...filtros, FK_proyecto: idProyecto } : filtros
  )
  // Con un proyecto elegido el ranking de clientes no se muestra: tampoco se pide.
  const clientes = useIngresosPorCliente(tieneFiltroProyecto ? null : filtros)
  const margen = useMargenProyecto({
    FK_proyecto: idProyecto ?? undefined,
    page: paginaMargen,
    limit: MARGEN_PROYECTOS_POR_PAGINA,
  })

  const statusCode = error?.statusCode

  // El interceptor del httpClient ya intenta renovar la sesión; si igual llega
  // un 401 es que no hay sesión recuperable.
  useEffect(() => {
    if (statusCode === 401) navigate(PATHS.LOGIN, { replace: true })
  }, [statusCode, navigate])

  if (statusCode === 403) {
    return (
      <EmptyState
        icono={ShieldAlert}
        titulo="No tenés permisos para acceder a esta sección"
        descripcion="Se requiere el rol Administrador."
      />
    )
  }

  return (
    <div className="space-y-4">
      <FiltrosTableroBar
        agrupacion={agrupacion}
        onAgrupacionChange={setAgrupacion}
        fechaDesde={fechaDesde}
        onFechaDesdeChange={setFechaDesde}
        fechaHasta={fechaHasta}
        onFechaHastaChange={setFechaHasta}
        errorRango={
          rangoInvalido ? 'La fecha desde no puede ser posterior a la fecha hasta' : undefined
        }
        proyecto={proyecto}
        onProyectoChange={cambiarProyecto}
        onRestablecer={restablecer}
        hayCambios={hayCambios}
      />

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner className="text-primary size-8" />
        </div>
      )}

      {/* Un 400 es del rango (ej. más de 60 períodos): el mensaje del backend ya dice qué acortar. */}
      {error && statusCode !== 401 && (
        <ErrorState mensaje={formatearMensajeError(error.message)} onReintentar={() => refetch()} />
      )}

      {data && !error && (
        <>
          <IndicadoresTablero
            datos={data}
            margenRealizado={{
              importe: margen.data?.margen_total_realizado,
              estaCargando: margen.isLoading,
              tieneError: margen.isError,
            }}
          />

          <EvolucionTablero periodos={data.periodos} tieneFiltroProyecto={tieneFiltroProyecto} />

          {!tieneFiltroProyecto && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <RankingTablero
                titulo="Proyectos que más ingresaron"
                ranking={{
                  items: rankingProyectos(data.totales.ingresosPorProyecto),
                  totalIngresos: data.totales.ingresos,
                }}
              />

              <RankingTablero
                titulo="Clientes que más aportaron"
                ranking={clientes.data}
                cargando={clientes.isLoading}
                error={clientes.isError}
              />
            </div>
          )}

          {/* Separado de lo de arriba, que responde al rango de fechas: el margen es a la fecha. */}
          <div className="border-subtle border-t pt-4">
            <MargenProyectoTablero
              margen={margen.data}
              cargando={margen.isLoading}
              error={margen.error}
              actualizando={margen.isPlaceholderData}
              tieneFiltroProyecto={tieneFiltroProyecto}
              onPaginaChange={setPaginaMargen}
            />
          </div>

          <aside
            aria-label="Aclaraciones"
            className="text-content-muted flex items-start gap-2 text-xs"
          >
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <ul className="space-y-1">
              <li>
                Los egresos no se abren por proyecto: los pagos a proveedores no se asocian a
                proyectos.
              </li>
              <li>
                Los ingresos incluyen los intereses de financiación cobrados. No cuentan los cobros
                ni los pagos anulados. Los rankings muestran los 5 que más aportaron.
              </li>
              <li>El resultado es ingresos menos egresos del rango elegido.</li>
              <li>
                Con un proyecto seleccionado no se muestran el resultado ni los rankings: los
                egresos no pueden atribuirse a un proyecto, y lo cobrado por cliente no se puede
                abrir por proyecto.
              </li>
              <li>
                El margen es comercial: compara el precio de venta con el costo de cada unidad. No
                incluye los intereses de financiación ni gastos que no estén cargados como costo de
                la unidad.
              </li>
              <li>
                El porcentaje del margen es sobre las ventas (margen ÷ precio). El margen es a la
                fecha: no depende del rango de fechas elegido.
              </li>
            </ul>
          </aside>
        </>
      )}
    </div>
  )
}
