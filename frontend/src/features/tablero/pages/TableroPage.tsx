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
import { RankingTablero } from '../components/RankingTablero'
import { AGRUPACION_INICIAL } from '../config/tablero.config'
import { useIngresosEgresos, useIngresosPorCliente } from '../hooks/useTablero'
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
 * egresos por período y reparto de los ingresos por proyecto. Por defecto, el
 * año en curso agrupado por mes. Es de solo lectura: todo se calcula en el
 * backend al consultar.
 */
export function TableroPage() {
  const navigate = useNavigate()

  const [agrupacion, setAgrupacion] = useState<Agrupacion>(AGRUPACION_INICIAL)
  const [fechaDesde, setFechaDesde] = useState(() => anioEnCurso().desde)
  const [fechaHasta, setFechaHasta] = useState(() => anioEnCurso().hasta)

  const inicial = anioEnCurso()
  const hayCambios =
    agrupacion !== AGRUPACION_INICIAL ||
    fechaDesde !== inicial.desde ||
    fechaHasta !== inicial.hasta

  function restablecer() {
    const rango = anioEnCurso()
    setAgrupacion(AGRUPACION_INICIAL)
    setFechaDesde(rango.desde)
    setFechaHasta(rango.hasta)
  }

  const fechasCompletas = fechaDesde !== '' && fechaHasta !== ''
  const rangoInvalido = fechasCompletas && fechaDesde > fechaHasta

  const filtros =
    fechasCompletas && !rangoInvalido
      ? {
          agrupacion,
          fechaDesde: inicioDelDiaIso(fechaDesde),
          fechaHasta: finDelDiaIso(fechaHasta),
        }
      : null

  const { data, isLoading, error, refetch } = useIngresosEgresos(filtros)
  const clientes = useIngresosPorCliente(filtros)

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
          <IndicadoresTablero datos={data} />

          <EvolucionTablero periodos={data.periodos} />

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
            </ul>
          </aside>
        </>
      )}
    </div>
  )
}
