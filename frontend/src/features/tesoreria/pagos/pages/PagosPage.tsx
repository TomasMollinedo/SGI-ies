import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Ban, Eye, Plus, ShieldAlert } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
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
import { AnularPagoModal } from '../components/AnularPagoModal'
import { FiltrosPagosBar } from '../components/FiltrosPagosBar'
import { PagoDetalleModal } from '../components/PagoDetalleModal'
import { ResumenPeriodoPago } from '../components/ResumenPeriodoPago'
import { COLUMNAS_PAGOS, LIMITE_PAGINA } from '../config/pago.config'
import { useAnularPago, usePagos } from '../hooks/usePagos'
import type { FiltroEstadoPago, Pago, PagoDetalle } from '../types/pago.types'
import { formatearCodigoPago } from '../utils/codigoPago'
import { finDelDiaIso, inicioDelDiaIso } from '@/shared/utils/fechaIso'

const FILTROS_VACIOS = {
  FK_proveedor: '',
  FK_forma_pago: '',
  estado: '' as FiltroEstadoPago,
  fechaDesde: '',
  fechaHasta: '',
}

/**
 * Listado de pagos: filtros combinables por proveedor, forma de pago, estado
 * y período, con el resumen de egresos cuando el período viene completo (ver
 * `ResumenPeriodoPago`). El alta de un pago nuevo es su propia pantalla
 * (`NuevoPagoPage`), no un modal.
 */
export function PagosPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [page, setPage] = useState(1)
  const [detalleId, setDetalleId] = useState<number | null>(null)
  const [anular, setAnular] = useState<Pago | PagoDetalle | null>(null)
  const [errorAnular, setErrorAnular] = useState<ApiErrorResponse | null>(null)

  const { FK_proveedor, FK_forma_pago, estado, fechaDesde, fechaHasta } = filtros

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

  const { data, isLoading, isFetching, error, refetch } = usePagos({
    FK_proveedor: FK_proveedor === '' ? undefined : Number(FK_proveedor),
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

  const anularMutation = useAnularPago()

  /** Errores que no dependen de lo cargado: se avisan y se cierra lo que estuviera abierto. */
  function manejarErrorComun(errorOperacion: ApiErrorResponse, cerrar: () => void): boolean {
    switch (errorOperacion.statusCode) {
      case 401:
        navigate(PATHS.LOGIN, { replace: true })
        return true
      case 403:
        toast.error('No tenés permisos para realizar esta acción')
        cerrar()
        return true
      case 404:
        toast.error('El pago ya no existe')
        cerrar()
        refetch()
        return true
      default:
        return false
    }
  }

  function ejecutarAnular(motivo: string) {
    if (!anular) return
    setErrorAnular(null)
    anularMutation.mutate(
      { id: anular.id_pago, payload: { motivo_anulacion: motivo } },
      {
        onSuccess: (anulado) => {
          toast.success(`Pago ${formatearCodigoPago(anulado.id_pago)} anulado.`)
          setAnular(null)
        },
        onError: (errorAnulacion) => {
          if (manejarErrorComun(errorAnulacion, () => setAnular(null))) return
          setErrorAnular(errorAnulacion)
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

  const pagos = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  const columnas: DataTableColumn<Pago>[] = [
    ...COLUMNAS_PAGOS,
    {
      key: 'acciones',
      label: '',
      render: (item) => (
        <div className="inline-flex items-center gap-1">
          <IconButton
            icon={<Eye />}
            ariaLabel="Ver detalle"
            variant="soft"
            size="sm"
            bgColor="fondo-ver"
            iconColor="info"
            onClick={() => setDetalleId(item.id_pago)}
          />
          {item.estado === 'CONFIRMADA' && (
            <IconButton
              icon={<Ban />}
              ariaLabel="Anular pago"
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
      <FiltrosPagosBar
        FK_proveedor={FK_proveedor}
        onFKProveedorChange={(valor) => cambiarFiltro('FK_proveedor', valor)}
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
          <Button icon={<Plus />} onClick={() => navigate(PATHS.TESORERIA.PAGOS.NUEVO)}>
            Nuevo pago
          </Button>
        }
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
            columns={columnas}
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

      <PagoDetalleModal
        idPago={detalleId}
        onClose={() => setDetalleId(null)}
        onAnular={(pago) => {
          setDetalleId(null)
          setErrorAnular(null)
          setAnular(pago)
        }}
      />

      <AnularPagoModal
        open={anular !== null}
        codigo={anular ? formatearCodigoPago(anular.id_pago) : ''}
        onCancel={() => {
          setAnular(null)
          setErrorAnular(null)
        }}
        onConfirm={ejecutarAnular}
        loading={anularMutation.isPending}
        error={errorAnular}
      />
    </div>
  )
}
