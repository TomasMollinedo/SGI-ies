import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Ban, Eye, Plus, ShieldAlert } from 'lucide-react'
import { PATHS, rutaDetalleCobro } from '@/app/router/paths'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { DataTable } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Button } from '@/shared/components/ui/Button'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { finDelDiaIso, inicioDelDiaIso } from '@/shared/utils/fechaIso'
import { AnularCobroModal } from '../components/AnularCobroModal'
import { FiltrosCobrosBar } from '../components/FiltrosCobrosBar'
import { ResumenPeriodoCobro } from '../components/ResumenPeriodoCobro'
import { COLUMNAS_COBROS, LIMITE_PAGINA } from '../config/cobro.config'
import { useAnularCobro, useCobros } from '../hooks/useCobros'
import type { CobroListItem, FiltroEstadoCobro } from '../types/cobro.types'
import { formatearCodigoCobro } from '../utils/codigoCobro'

const FILTROS_VACIOS = {
  FK_cliente: '',
  FK_forma_pago: '',
  estado: '' as FiltroEstadoCobro,
  fechaDesde: '',
  fechaHasta: '',
}

/**
 * Pantalla raíz de Cobranzas (HU-30): el listado de cobros (T115) con
 * filtros combinables por cliente, forma de pago, estado y período, y el
 * resumen de ingresos cuando el período viene completo (ver
 * `ResumenPeriodoCobro`). Molde: `PagosPage`.
 *
 * "Registrar cobro" (T114) va en la barra de filtros y abre su propia
 * pantalla. "Ver detalle" navega a `CobroDetallePage` (no hay modal de
 * detalle) y "Anular" reutiliza `AnularCobroModal`.
 */
export function CobranzasPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [page, setPage] = useState(1)
  const [anular, setAnular] = useState<CobroListItem | null>(null)
  const [errorAnular, setErrorAnular] = useState<ApiErrorResponse | null>(null)

  const { FK_cliente, FK_forma_pago, estado, fechaDesde, fechaHasta } = filtros

  // Las dos fechas son ISO `YYYY-MM-DD`, así que alcanza con compararlas como
  // texto: no hace falta parsearlas para saber cuál es anterior.
  const rangoInvalido = fechaDesde !== '' && fechaHasta !== '' && fechaDesde > fechaHasta
  const hayFiltros = Object.values(filtros).some((valor) => valor !== '')

  function cambiarFiltro<K extends keyof typeof FILTROS_VACIOS>(
    campo: K,
    valor: (typeof FILTROS_VACIOS)[K]
  ) {
    setFiltros((actuales) => ({ ...actuales, [campo]: valor }))
  }

  // Con otros filtros, la página en la que estaba parado el usuario puede no
  // existir más: siempre se vuelve a la primera.
  useEffect(() => {
    setPage(1)
  }, [filtros])

  const { data, isLoading, isFetching, error, refetch } = useCobros({
    FK_cliente: FK_cliente === '' ? undefined : Number(FK_cliente),
    FK_forma_pago: FK_forma_pago === '' ? undefined : Number(FK_forma_pago),
    estado: estado === '' ? undefined : estado,
    // Un rango al revés no se manda: el listado sigue mostrando el resto de
    // los filtros mientras el usuario corrige las fechas. El "hasta" va al
    // último instante del día para no dejar afuera los cobros de ese día.
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

  const anularMutation = useAnularCobro()

  function cerrarAnular() {
    setAnular(null)
    setErrorAnular(null)
  }

  function ejecutarAnular(motivo: string) {
    if (!anular) return
    setErrorAnular(null)
    anularMutation.mutate(
      { id: anular.id_cobro, payload: { motivo_anulacion: motivo } },
      {
        onSuccess: (anulado) => {
          toast.success(`Cobro ${formatearCodigoCobro(anulado.id_cobro)} anulado.`)
          setAnular(null)
        },
        onError: (errorAnulacion) => {
          switch (errorAnulacion.statusCode) {
            case 401:
              navigate(PATHS.LOGIN, { replace: true })
              return
            case 403:
              toast.error('No tenés permisos para realizar esta acción')
              cerrarAnular()
              return
            case 404:
              toast.error('El cobro ya no existe')
              cerrarAnular()
              refetch()
              return
          }
          // 409 (ya anulado por otra vía) y validaciones: quedan visibles en el modal.
          setErrorAnular(errorAnulacion)
          if (errorAnulacion.statusCode === 409) refetch()
        },
      }
    )
  }

  if (statusCode === 403) {
    return (
      <EmptyState
        icono={ShieldAlert}
        titulo="No tenés permisos para acceder a esta sección"
        descripcion="Se requiere el rol Administrador."
      />
    )
  }

  const cobros = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  const columnas: DataTableColumn<CobroListItem>[] = [
    ...COLUMNAS_COBROS,
    {
      key: 'acciones',
      label: 'Acciones',
      render: (item) => (
        <div className="inline-flex items-center gap-1">
          <IconButton
            icon={<Eye />}
            ariaLabel="Ver detalle"
            variant="soft"
            size="sm"
            bgColor="fondo-ver"
            iconColor="info"
            onClick={() => navigate(rutaDetalleCobro(item.id_cobro))}
          />
          {item.estado === 'CONFIRMADO' && (
            <IconButton
              icon={<Ban />}
              ariaLabel="Anular cobro"
              variant="soft"
              size="sm"
              bgColor="fondo-eliminar"
              iconColor="error"
              disabled={anularMutation.isPending}
              onClick={() => {
                setErrorAnular(null)
                setAnular(item)
              }}
            />
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <FiltrosCobrosBar
        FK_cliente={FK_cliente}
        onFKClienteChange={(valor) => cambiarFiltro('FK_cliente', valor)}
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
        acciones={
          <Button icon={<Plus />} onClick={() => navigate(PATHS.TESORERIA.COBRANZAS.NUEVO)}>
            Registrar cobro
          </Button>
        }
      />

      {/* Si se muestra o no lo decide el backend (null salvo período completo). */}
      {data?.resumenPeriodo && <ResumenPeriodoCobro resumen={data.resumenPeriodo} />}

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

      {!isLoading && !error && cobros.length === 0 && (
        <EmptyState
          titulo={
            hayFiltros
              ? 'No se encontraron cobros con esos filtros'
              : 'Todavía no hay cobros registrados'
          }
          descripcion={
            hayFiltros
              ? 'Probá ajustar los filtros de búsqueda.'
              : 'Los cobros que se registren van a aparecer acá.'
          }
        />
      )}

      {!isLoading && !error && cobros.length > 0 && (
        <>
          <DataTable
            data={cobros}
            columns={columnas}
            obtenerId={(item) => String(item.id_cobro)}
            ariaLabel="Cobros"
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

      <AnularCobroModal
        open={anular !== null}
        codigo={anular ? formatearCodigoCobro(anular.id_cobro) : ''}
        onCancel={cerrarAnular}
        onConfirm={ejecutarAnular}
        loading={anularMutation.isPending}
        error={errorAnular}
      />
    </div>
  )
}
