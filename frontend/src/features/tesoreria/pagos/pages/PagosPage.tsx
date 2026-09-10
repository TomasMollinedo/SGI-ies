import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ShieldAlert } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { DataTable } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { FiltrosPagosBar } from '../components/FiltrosPagosBar'
import { ResumenPeriodoPago } from '../components/ResumenPeriodoPago'
import { COLUMNAS_PAGOS, DEBOUNCE_BUSQUEDA, LIMITE_PAGINA } from '../config/pago.config'
import { usePagos } from '../hooks/usePagos'
import type { FiltroEstadoPago } from '../types/pago.types'
import { finDelDiaIso, inicioDelDiaIso } from '@/shared/utils/fechaIso'

const FILTROS_VACIOS = {
  busquedaProveedor: '',
  FK_forma_pago: '',
  estado: '' as FiltroEstadoPago,
  fechaDesde: '',
  fechaHasta: '',
}

/**
 * Listado de pagos: filtros combinables por proveedor, forma de pago, estado
 * y período, con el resumen de egresos cuando el período viene completo (ver
 * `ResumenPeriodoPago`).
 *
 * Solo listado — ver el detalle de un pago o anularlo quedan para otra tarea.
 */
export function PagosPage() {
  const navigate = useNavigate()

  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [page, setPage] = useState(1)

  const { busquedaProveedor, FK_forma_pago, estado, fechaDesde, fechaHasta } = filtros

  // Las dos fechas son ISO `YYYY-MM-DD`, así que alcanza con compararlas como
  // texto: no hace falta parsearlas para saber cuál es anterior.
  const rangoInvalido = fechaDesde !== '' && fechaHasta !== '' && fechaDesde > fechaHasta
  const hayFiltros = Object.values(filtros).some((valor) => valor !== '')

  const busquedaProveedorDebounced = useDebounce(busquedaProveedor.trim(), DEBOUNCE_BUSQUEDA)

  function cambiarFiltro<K extends keyof typeof FILTROS_VACIOS>(
    campo: K,
    valor: (typeof FILTROS_VACIOS)[K]
  ) {
    setFiltros((actuales) => ({ ...actuales, [campo]: valor }))
  }

  // Con otros filtros, la página en la que estaba parado el usuario puede no
  // existir más: siempre se vuelve a la primera. La búsqueda de proveedor usa
  // el valor debounced acá, para no resetear la página en cada tecla.
  useEffect(() => {
    setPage(1)
  }, [busquedaProveedorDebounced, FK_forma_pago, estado, fechaDesde, fechaHasta])

  const { data, isLoading, isFetching, error, refetch } = usePagos({
    busquedaProveedor: busquedaProveedorDebounced || undefined,
    FK_forma_pago: FK_forma_pago === '' ? undefined : Number(FK_forma_pago),
    estado: estado === '' ? undefined : estado,
    // Un rango al revés no se manda: el listado sigue mostrando el resto de
    // los filtros mientras el usuario corrige las fechas, en vez de quedar
    // vacío.
    fechaDesde: rangoInvalido || fechaDesde === '' ? undefined : inicioDelDiaIso(fechaDesde),
    fechaHasta: rangoInvalido || fechaHasta === '' ? undefined : finDelDiaIso(fechaHasta),
    page,
    limit: LIMITE_PAGINA,
  })

  const statusCode = error?.statusCode

  // El interceptor del httpClient ya intenta renovar la sesión; si igual llega
  // un 401 es que no hay sesión recuperable.
  useEffect(() => {
    if (statusCode === 401) navigate(PATHS.LOGIN, { replace: true })
  }, [statusCode, navigate])

  // Un 400 es de los filtros o de la paginación: se vuelve a la primera página
  // para salir de la combinación inválida.
  useEffect(() => {
    if (statusCode === 400) setPage(1)
  }, [statusCode])

  if (statusCode === 403) {
    return (
      <EmptyState
        icono={ShieldAlert}
        titulo="No tenés permisos para acceder a esta sección"
        descripcion="Se requiere el rol Administrador."
      />
    )
  }

  const pagos = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  return (
    <div className="space-y-4">
      <FiltrosPagosBar
        busquedaProveedor={busquedaProveedor}
        onBusquedaProveedorChange={(valor) => cambiarFiltro('busquedaProveedor', valor)}
        FK_forma_pago={FK_forma_pago}
        onFKFormaPagoChange={(valor) => cambiarFiltro('FK_forma_pago', valor)}
        estado={estado}
        onEstadoChange={(valor) => cambiarFiltro('estado', valor)}
        fechaDesde={fechaDesde}
        onFechaDesdeChange={(valor) => cambiarFiltro('fechaDesde', valor)}
        fechaHasta={fechaHasta}
        onFechaHastaChange={(valor) => cambiarFiltro('fechaHasta', valor)}
        errorRango={
          rangoInvalido ? 'La fecha desde no puede ser posterior a la fecha hasta' : undefined
        }
        onLimpiar={() => setFiltros(FILTROS_VACIOS)}
        hayFiltros={hayFiltros}
      />

      {data?.resumenPeriodo && <ResumenPeriodoPago resumen={data.resumenPeriodo} />}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner className="text-primary size-8" />
        </div>
      )}

      {error && statusCode !== 401 && (
        <ErrorState
          mensaje={
            statusCode === 400
              ? 'Los filtros aplicados no son válidos. Se reinició la paginación.'
              : formatearMensajeError(error.message)
          }
          onReintentar={() => refetch()}
        />
      )}

      {!isLoading && !error && pagos.length === 0 && (
        <EmptyState
          titulo={
            hayFiltros
              ? 'No se encontraron pagos con esos filtros'
              : 'Todavía no hay pagos registrados'
          }
          descripcion={
            hayFiltros
              ? 'Probá ajustar los filtros de búsqueda.'
              : 'Los pagos que se confirmen van a aparecer acá.'
          }
        />
      )}

      {!isLoading && !error && pagos.length > 0 && (
        <>
          <DataTable
            data={pagos}
            columns={COLUMNAS_PAGOS}
            obtenerId={(item) => String(item.id_pago)}
            ariaLabel="Pagos"
          />

          {meta && (
            <Pagination
              currentPage={meta.page}
              totalPages={totalPaginas}
              totalItems={meta.total}
              pageSize={meta.limit}
              onPageChange={setPage}
              disabled={isFetching}
            />
          )}
        </>
      )}
    </div>
  )
}
