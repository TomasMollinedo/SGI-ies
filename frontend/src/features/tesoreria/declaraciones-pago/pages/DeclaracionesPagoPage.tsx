import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Ban, BadgeCheck, Receipt, ShieldAlert } from 'lucide-react'
import { PATHS, rutaDetalleCobro } from '@/app/router/paths'
import type { ClienteResumen } from '@/features/comercializacion/ventas/types/venta.types'
import { formatearCodigoCobro } from '@/features/tesoreria/cobranzas/utils/codigoCobro'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { DataTable } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { finDelDiaIso, inicioDelDiaIso } from '@/shared/utils/fechaIso'
import { FiltrosDeclaracionesPagoBar } from '../components/FiltrosDeclaracionesPagoBar'
import { RechazarDeclaracionModal } from '../components/RechazarDeclaracionModal'
import { ValidarDeclaracionModal } from '../components/ValidarDeclaracionModal'
import { COLUMNAS_DECLARACIONES, LIMITE_PAGINA } from '../config/declaracionPago.config'
import {
  useDeclaracionesPago,
  useRechazarDeclaracionPago,
  useValidarDeclaracionPago,
} from '../hooks/useDeclaracionesPago'
import {
  DECLARACIONES_PAGO_QUERY_KEYS,
  releerDeclaracionPago,
} from '../services/declaracionesPago.service'
import type { DeclaracionPago, FiltroEstadoDeclaracion } from '../types/declaracionPago.types'

interface FiltrosDeclaraciones {
  cliente: ClienteResumen | null
  FK_forma_pago: string
  estado: FiltroEstadoDeclaracion
  fechaDesde: string
  fechaHasta: string
}

/** La bandeja arranca mostrando solo lo que falta resolver. */
const FILTROS_POR_DEFECTO: FiltrosDeclaraciones = {
  cliente: null,
  FK_forma_pago: '',
  estado: 'PENDIENTE',
  fechaDesde: '',
  fechaHasta: '',
}

const MENSAJE_YA_RESUELTA = 'Esta declaración ya fue resuelta. Se actualizó la bandeja.'

/**
 * Bandeja de validación de declaraciones de pago (T117, HU-29). Es una cola
 * de trabajo, no un tablero: sin indicadores ni resúmenes, con el orden que
 * fija el backend (la más antigua primero). Filtros combinables por
 * cliente, estado, forma de pago y período. Sobre una PENDIENTE, Tesorería
 * la valida (se genera un cobro) o la rechaza con un motivo; una VALIDADA
 * lleva al detalle del cobro que generó.
 */
export function DeclaracionesPagoPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [filtros, setFiltros] = useState(FILTROS_POR_DEFECTO)
  const [page, setPage] = useState(1)

  const [aValidar, setAValidar] = useState<DeclaracionPago | null>(null)
  const [errorSaldo, setErrorSaldo] = useState<string | null>(null)
  const [errorValidar, setErrorValidar] = useState<string | null>(null)
  const [releyendo, setReleyendo] = useState(false)

  const [aRechazar, setARechazar] = useState<DeclaracionPago | null>(null)
  const [errorRechazar, setErrorRechazar] = useState<string | null>(null)

  const { cliente, FK_forma_pago, estado, fechaDesde, fechaHasta } = filtros

  // Las dos fechas son ISO `YYYY-MM-DD`: alcanza con compararlas como texto.
  const rangoInvalido = fechaDesde !== '' && fechaHasta !== '' && fechaDesde > fechaHasta
  const hayFiltros =
    cliente !== null ||
    FK_forma_pago !== FILTROS_POR_DEFECTO.FK_forma_pago ||
    estado !== FILTROS_POR_DEFECTO.estado ||
    fechaDesde !== '' ||
    fechaHasta !== ''

  function cambiarFiltro<K extends keyof FiltrosDeclaraciones>(
    campo: K,
    valor: FiltrosDeclaraciones[K]
  ) {
    setFiltros((actuales) => ({ ...actuales, [campo]: valor }))
  }

  // Con otros filtros, la página en la que estaba parado el usuario puede no
  // existir más: siempre se vuelve a la primera.
  useEffect(() => {
    setPage(1)
  }, [filtros])

  const { data, isLoading, isFetching, error, refetch } = useDeclaracionesPago({
    FK_cliente: cliente?.id_cliente,
    FK_forma_pago: FK_forma_pago === '' ? undefined : Number(FK_forma_pago),
    estado: estado === '' ? undefined : estado,
    // Un rango al revés no se manda: la bandeja sigue mostrando el resto de
    // los filtros mientras el usuario corrige las fechas.
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

  // Un 400 es de los filtros o de la paginación: se vuelve a la primera página.
  useEffect(() => {
    if (statusCode === 400) setPage(1)
  }, [statusCode])

  const validarMutation = useValidarDeclaracionPago()
  const rechazarMutation = useRechazarDeclaracionPago()

  function refrescarBandeja() {
    queryClient.invalidateQueries({ queryKey: DECLARACIONES_PAGO_QUERY_KEYS.LISTAS })
  }

  /** Errores que no dependen de la declaración: se avisan y se cierra lo que estuviera abierto. */
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
        toast.error('La declaración ya no existe')
        cerrar()
        refrescarBandeja()
        return true
      default:
        return false
    }
  }

  function abrirValidar(declaracion: DeclaracionPago) {
    setErrorSaldo(null)
    setErrorValidar(null)
    setAValidar(declaracion)
  }

  function cerrarValidar() {
    setAValidar(null)
    setErrorSaldo(null)
    setErrorValidar(null)
  }

  function abrirRechazar(declaracion: DeclaracionPago) {
    setErrorRechazar(null)
    setARechazar(declaracion)
  }

  function cerrarRechazar() {
    setARechazar(null)
    setErrorRechazar(null)
  }

  /**
   * Un 409 al validar tiene dos causas posibles, y la respuesta es distinta:
   * se relee la declaración para saber cuál fue. Si sigue PENDIENTE, el saldo
   * de la cuota ya no alcanza — el diálogo queda abierto con el motivo (y el
   * saldo actualizado) y ofrece ir directo al rechazo. Si ya no está
   * PENDIENTE, otro usuario la resolvió mientras tanto.
   */
  async function manejarConflictoValidacion(declaracion: DeclaracionPago, mensaje: string) {
    setReleyendo(true)
    try {
      const actual = await releerDeclaracionPago(declaracion)
      if (actual?.estado === 'PENDIENTE') {
        setAValidar(actual)
        setErrorSaldo(mensaje)
      } else {
        cerrarValidar()
        toast.warning(MENSAJE_YA_RESUELTA)
      }
    } catch (errorRelectura) {
      setErrorValidar(formatearMensajeError((errorRelectura as ApiErrorResponse).message))
    } finally {
      setReleyendo(false)
      // En cualquiera de los dos casos lo que muestra la bandeja quedó viejo
      // (el saldo de la cuota o el estado de la declaración).
      refrescarBandeja()
    }
  }

  function ejecutarValidar() {
    if (!aValidar) return
    const declaracion = aValidar
    setErrorValidar(null)
    validarMutation.mutate(declaracion.id_declaracion_pago, {
      onSuccess: (validada) => {
        toast.success(
          validada.FK_cobro !== null
            ? `Declaración validada. Se registró el cobro ${formatearCodigoCobro(validada.FK_cobro)}.`
            : 'Declaración validada.'
        )
        cerrarValidar()
      },
      onError: (errorValidacion) => {
        if (manejarErrorComun(errorValidacion, cerrarValidar)) return
        if (errorValidacion.statusCode === 409) {
          void manejarConflictoValidacion(
            declaracion,
            formatearMensajeError(errorValidacion.message)
          )
          return
        }
        setErrorValidar(formatearMensajeError(errorValidacion.message))
      },
    })
  }

  function irARechazarDesdeValidar() {
    if (!aValidar) return
    const declaracion = aValidar
    cerrarValidar()
    abrirRechazar(declaracion)
  }

  function ejecutarRechazar(motivo: string) {
    if (!aRechazar) return
    setErrorRechazar(null)
    rechazarMutation.mutate(
      { id: aRechazar.id_declaracion_pago, payload: { motivo_rechazo: motivo } },
      {
        onSuccess: () => {
          toast.success('Declaración rechazada. El cliente va a ver el motivo en su perfil.')
          cerrarRechazar()
        },
        onError: (errorRechazo) => {
          if (manejarErrorComun(errorRechazo, cerrarRechazar)) return
          if (errorRechazo.statusCode === 409) {
            cerrarRechazar()
            toast.warning(MENSAJE_YA_RESUELTA)
            refrescarBandeja()
            return
          }
          setErrorRechazar(formatearMensajeError(errorRechazo.message))
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

  const declaraciones = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0
  const operando = validarMutation.isPending || rechazarMutation.isPending || releyendo

  const columnas: DataTableColumn<DeclaracionPago>[] = [
    ...COLUMNAS_DECLARACIONES,
    {
      key: 'acciones',
      label: 'Acciones',
      render: (item) => renderAcciones(item),
    },
  ]

  /** Validar/rechazar solo sobre una PENDIENTE; una VALIDADA lleva a su cobro. */
  function renderAcciones(declaracion: DeclaracionPago) {
    if (declaracion.estado === 'PENDIENTE') {
      return (
        <div className="inline-flex items-center gap-1">
          <IconButton
            icon={<BadgeCheck />}
            ariaLabel="Validar declaración"
            title="Validar"
            variant="soft"
            size="sm"
            bgColor="success-soft"
            iconColor="success"
            disabled={operando}
            onClick={() => abrirValidar(declaracion)}
          />
          <IconButton
            icon={<Ban />}
            ariaLabel="Rechazar declaración"
            title="Rechazar"
            variant="soft"
            size="sm"
            bgColor="fondo-eliminar"
            iconColor="error"
            disabled={operando}
            onClick={() => abrirRechazar(declaracion)}
          />
        </div>
      )
    }

    if (declaracion.estado === 'VALIDADA' && declaracion.cobro) {
      const { id_cobro: idCobro, estado: estadoCobro } = declaracion.cobro
      return (
        <div className="inline-flex items-center gap-2">
          <IconButton
            icon={<Receipt />}
            ariaLabel={`Ver cobro ${formatearCodigoCobro(idCobro)}`}
            title={`Ver cobro ${formatearCodigoCobro(idCobro)}`}
            variant="soft"
            size="sm"
            bgColor="fondo-ver"
            iconColor="info"
            onClick={() => navigate(rutaDetalleCobro(idCobro))}
          />
          {estadoCobro === 'ANULADO' && (
            <span className="text-error text-xs font-medium whitespace-nowrap">Cobro anulado</span>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <div className="space-y-4">
      <FiltrosDeclaracionesPagoBar
        cliente={cliente}
        onClienteChange={(valor) => cambiarFiltro('cliente', valor)}
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
        onLimpiar={() => setFiltros(FILTROS_POR_DEFECTO)}
        hayFiltros={hayFiltros}
      />

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

      {!isLoading && !error && declaraciones.length === 0 && (
        <EmptyState
          titulo={
            estado === 'PENDIENTE' && !hayFiltros
              ? 'No hay declaraciones pendientes de validar'
              : 'No se encontraron declaraciones con esos filtros'
          }
          descripcion={
            estado === 'PENDIENTE' && !hayFiltros
              ? 'Las declaraciones que carguen los clientes desde la web van a aparecer acá.'
              : 'Probá ajustar los filtros de búsqueda.'
          }
        />
      )}

      {!isLoading && !error && declaraciones.length > 0 && (
        <>
          <DataTable
            data={declaraciones}
            columns={columnas}
            obtenerId={(item) => String(item.id_declaracion_pago)}
            ariaLabel="Declaraciones de pago"
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

      <ValidarDeclaracionModal
        declaracion={aValidar}
        onCancel={cerrarValidar}
        onConfirm={ejecutarValidar}
        loading={validarMutation.isPending || releyendo}
        errorSaldo={errorSaldo}
        error={errorValidar}
        onIrARechazar={irARechazarDesdeValidar}
      />

      <RechazarDeclaracionModal
        declaracion={aRechazar}
        onCancel={cerrarRechazar}
        onConfirm={ejecutarRechazar}
        loading={rechazarMutation.isPending}
        error={errorRechazar}
      />
    </div>
  )
}
