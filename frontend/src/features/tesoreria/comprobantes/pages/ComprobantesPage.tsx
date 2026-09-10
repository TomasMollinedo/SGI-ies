import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, Receipt, ShieldAlert } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { DataTable } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Button } from '@/shared/components/ui/Button'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { AccionesComprobanteRow } from '../components/AccionesComprobanteRow'
import { AnularComprobanteModal } from '../components/AnularComprobanteModal'
import { ComprobanteDetalleModal } from '../components/ComprobanteDetalleModal'
import { ComprobanteForm } from '../components/ComprobanteForm'
import { COLUMNAS_COMPROBANTES, LIMITE_PAGINA } from '../config/comprobante.config'
import { FiltrosComprobantesBar } from '../components/FiltrosComprobantesBar'
import {
  useAnularComprobante,
  useComprobanteDetalle,
  useComprobantes,
  useConfirmarComprobante,
  useCrearComprobante,
  useEditarComprobante,
} from '../hooks/useComprobantes'
import type { ComprobanteFormOutput } from '../types/comprobante.schema'
import type {
  Comprobante,
  ComprobanteDetalle,
  ComprobanteListItem,
  CrearComprobantePayload,
} from '../types/comprobante.types'
import { formatearNumeroComprobante } from '../utils/numeroComprobante'

function construirPayload(payload: ComprobanteFormOutput): CrearComprobantePayload {
  return {
    FK_tipo_comprobante: payload.FK_tipo_comprobante,
    FK_proveedor: payload.FK_proveedor,
    FK_orden_compra: payload.FK_orden_compra ? Number(payload.FK_orden_compra) : undefined,
    FK_comprobante_origen: payload.FK_comprobante_origen
      ? Number(payload.FK_comprobante_origen)
      : undefined,
    letra: payload.letra,
    punto_de_venta: payload.punto_de_venta,
    numero: payload.numero,
    fecha_emision: payload.fecha_emision,
    fecha_vencimiento: payload.fecha_vencimiento,
    observaciones: payload.observaciones || undefined,
    alicuota_iva: payload.alicuota_iva,
    detalle: payload.detalle.map((linea) => ({
      descripcion: linea.descripcion,
      FK_articulo: linea.FK_articulo ? Number(linea.FK_articulo) : undefined,
      cantidad: linea.cantidad,
      precio_unitario: linea.precio_unitario,
    })),
  }
}

type EstadoFormulario = { modo: 'crear' } | { modo: 'editar'; comprobante: ComprobanteDetalle } | null
type EstadoAnular = { id: number; numero: string } | null

/** Comprobantes de proveedor (HU-16): listado, alta, edición de borradores, confirmación y anulación. */
export function ComprobantesPage() {
  const toast = useToast()
  const navigate = useNavigate()

  const [FK_proveedor, setFKProveedor] = useState('')
  const [FK_tipo_comprobante, setFKTipoComprobante] = useState('')
  const [aumentaSaldo, setAumentaSaldo] = useState('')
  const [estado, setEstado] = useState('')
  const [estadoSaldo, setEstadoSaldo] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [page, setPage] = useState(1)

  const [detalleId, setDetalleId] = useState<number | null>(null)
  const [formulario, setFormulario] = useState<EstadoFormulario>(null)
  const [errorFormulario, setErrorFormulario] = useState<ApiErrorResponse | null>(null)
  const [idParaEditar, setIdParaEditar] = useState<number | null>(null)
  const [anular, setAnular] = useState<EstadoAnular>(null)
  const [errorAnular, setErrorAnular] = useState<ApiErrorResponse | null>(null)
  const [confirmarFila, setConfirmarFila] = useState<ComprobanteListItem | null>(null)
  const [errorConfirmarFila, setErrorConfirmarFila] = useState<ApiErrorResponse | null>(null)

  const rangoInvalido = fechaDesde !== '' && fechaHasta !== '' && fechaHasta < fechaDesde

  useEffect(() => {
    setPage(1)
  }, [FK_proveedor, FK_tipo_comprobante, aumentaSaldo, estado, estadoSaldo, fechaDesde, fechaHasta])

  const { data, isLoading, isFetching, error, refetch } = useComprobantes({
    FK_proveedor: FK_proveedor ? Number(FK_proveedor) : undefined,
    FK_tipo_comprobante: FK_tipo_comprobante ? Number(FK_tipo_comprobante) : undefined,
    aumentaSaldo: aumentaSaldo === '' ? undefined : aumentaSaldo === 'true',
    estado: estado === '' ? undefined : (estado as ComprobanteListItem['estado']),
    estadoSaldo: estadoSaldo === '' ? undefined : (estadoSaldo as 'PENDIENTE' | 'SALDADO'),
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
    page,
    limit: LIMITE_PAGINA,
  })

  const statusCode = error?.statusCode

  useEffect(() => {
    if (statusCode === 401) navigate(PATHS.LOGIN, { replace: true })
  }, [statusCode, navigate])

  useEffect(() => {
    if (statusCode === 400) setPage(1)
  }, [statusCode])

  useEffect(() => {
    if (isFetching || !data) return
    if (data.data.length === 0 && data.meta.page > 1) setPage(data.meta.page - 1)
  }, [isFetching, data])

  const crear = useCrearComprobante()
  const editar = useEditarComprobante()
  const confirmar = useConfirmarComprobante()
  const anularMutation = useAnularComprobante()
  const operando = crear.isPending || editar.isPending || confirmar.isPending || anularMutation.isPending

  // Al tocar "editar" en una fila BORRADOR, se pide el detalle (la fila no trae
  // las líneas) y recién con eso se abre el formulario en modo edición.
  const detalleParaEditar = useComprobanteDetalle(idParaEditar)
  useEffect(() => {
    if (idParaEditar === null) return
    if (detalleParaEditar.data) {
      setErrorFormulario(null)
      setFormulario({ modo: 'editar', comprobante: detalleParaEditar.data })
      setIdParaEditar(null)
      return
    }
    if (detalleParaEditar.error) {
      toast.error(formatearMensajeError(detalleParaEditar.error.message))
      setIdParaEditar(null)
    }
  }, [idParaEditar, detalleParaEditar.data, detalleParaEditar.error, toast])

  const cerrarDetalle = useCallback(() => setDetalleId(null), [])

  function cerrarFormulario() {
    setFormulario(null)
    setErrorFormulario(null)
  }

  /** Errores que no dependen de lo cargado: se avisan y se cierra lo que estuviera abierto. */
  function manejarErrorComun(error: ApiErrorResponse, cerrar: () => void): boolean {
    switch (error.statusCode) {
      case 401:
        navigate(PATHS.LOGIN, { replace: true })
        return true
      case 403:
        toast.error('No tenés permisos para realizar esta acción')
        cerrar()
        return true
      case 404:
        toast.error('El comprobante ya no existe')
        cerrar()
        refetch()
        return true
      default:
        return false
    }
  }

  function manejarErrorFormulario(error: ApiErrorResponse) {
    if (manejarErrorComun(error, cerrarFormulario)) return
    setErrorFormulario(error)
  }

  function guardarOConfirmar(payload: ComprobanteFormOutput, luegoConfirmar: boolean) {
    setErrorFormulario(null)
    const body = construirPayload(payload)
    const esEdicion = formulario?.modo === 'editar'

    const alGuardar = (comprobante: Comprobante) => {
      if (!luegoConfirmar) {
        toast.success(
          `Comprobante ${formatearNumeroComprobante(comprobante)} ${
            esEdicion ? 'actualizado' : 'guardado como borrador'
          }.`
        )
        cerrarFormulario()
        return
      }
      confirmar.mutate(comprobante.id_comprobante_proveedor, {
        onSuccess: (registrado) => {
          toast.success(`Comprobante ${formatearNumeroComprobante(registrado)} registrado.`)
          cerrarFormulario()
        },
        onError: manejarErrorFormulario,
      })
    }

    if (formulario?.modo === 'editar') {
      editar.mutate(
        { id: formulario.comprobante.id_comprobante_proveedor, payload: body },
        { onSuccess: alGuardar, onError: manejarErrorFormulario }
      )
      return
    }

    crear.mutate(body, {
      onSuccess: (comprobante) => {
        alGuardar(comprobante)
        if (!luegoConfirmar) setPage(1)
      },
      onError: manejarErrorFormulario,
    })
  }

  function ejecutarConfirmarFila() {
    if (!confirmarFila) return
    setErrorConfirmarFila(null)
    confirmar.mutate(confirmarFila.id_comprobante_proveedor, {
      onSuccess: (registrado) => {
        toast.success(`Comprobante ${formatearNumeroComprobante(registrado)} registrado.`)
        setConfirmarFila(null)
      },
      onError: (error) => {
        if (manejarErrorComun(error, () => setConfirmarFila(null))) return
        setErrorConfirmarFila(error)
      },
    })
  }

  function ejecutarAnular(motivo: string) {
    if (!anular) return
    setErrorAnular(null)
    anularMutation.mutate(
      { id: anular.id, payload: { motivo_anulacion: motivo } },
      {
        onSuccess: (anulado) => {
          toast.success(`Comprobante ${formatearNumeroComprobante(anulado)} anulado.`)
          setAnular(null)
        },
        onError: (error) => {
          if (manejarErrorComun(error, () => setAnular(null))) return
          setErrorAnular(error)
        },
      }
    )
  }

  const columnas: DataTableColumn<ComprobanteListItem>[] = [
    ...COLUMNAS_COMPROBANTES,
    {
      key: 'acciones',
      label: 'Acciones',
      render: (item) => (
        <AccionesComprobanteRow
          comprobante={item}
          bloqueado={operando || idParaEditar !== null}
          onVer={() => setDetalleId(item.id_comprobante_proveedor)}
          onEditar={() => setIdParaEditar(item.id_comprobante_proveedor)}
          onConfirmar={() => {
            setErrorConfirmarFila(null)
            setConfirmarFila(item)
          }}
          onAnular={() =>
            setAnular({
              id: item.id_comprobante_proveedor,
              numero: formatearNumeroComprobante(item),
            })
          }
        />
      ),
    },
  ]

  if (statusCode === 403) {
    return (
      <EmptyState
        icono={ShieldAlert}
        titulo="No tenés permisos para acceder a esta sección"
        descripcion="Se requiere el rol Administrador."
      />
    )
  }

  const comprobantes = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <FiltrosComprobantesBar
          FK_proveedor={FK_proveedor}
          onFKProveedorChange={setFKProveedor}
          FK_tipo_comprobante={FK_tipo_comprobante}
          onFKTipoComprobanteChange={setFKTipoComprobante}
          aumentaSaldo={aumentaSaldo}
          onAumentaSaldoChange={setAumentaSaldo}
          estado={estado}
          onEstadoChange={setEstado}
          estadoSaldo={estadoSaldo}
          onEstadoSaldoChange={setEstadoSaldo}
          fechaDesde={fechaDesde}
          onFechaDesdeChange={setFechaDesde}
          fechaHasta={fechaHasta}
          onFechaHastaChange={setFechaHasta}
          errorRango={rangoInvalido ? 'El "hasta" no puede ser anterior al "desde"' : undefined}
          onLimpiar={() => {
            setFKProveedor('')
            setFKTipoComprobante('')
            setAumentaSaldo('')
            setEstado('')
            setEstadoSaldo('')
            setFechaDesde('')
            setFechaHasta('')
          }}
          hayFiltros={
            FK_proveedor !== '' ||
            FK_tipo_comprobante !== '' ||
            aumentaSaldo !== '' ||
            estado !== '' ||
            estadoSaldo !== '' ||
            fechaDesde !== '' ||
            fechaHasta !== ''
          }
          acciones={
            <Button icon={<Plus />} onClick={() => setFormulario({ modo: 'crear' })}>
              Nuevo comprobante
            </Button>
          }
        />
      </div>

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

      {!isLoading && !error && comprobantes.length === 0 && (
        <EmptyState
          icono={Receipt}
          titulo="No se encontraron comprobantes"
          descripcion="Probá ajustar los filtros, o cargá uno nuevo con «Nuevo comprobante»."
        />
      )}

      {!isLoading && !error && comprobantes.length > 0 && (
        <>
          <DataTable
            data={comprobantes}
            columns={columnas}
            obtenerId={(item) => String(item.id_comprobante_proveedor)}
            ariaLabel="Comprobantes"
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

      <ComprobanteForm
        open={formulario !== null}
        onClose={cerrarFormulario}
        comprobante={formulario?.modo === 'editar' ? formulario.comprobante : undefined}
        onGuardar={(payload) => guardarOConfirmar(payload, false)}
        onConfirmar={(payload) => guardarOConfirmar(payload, true)}
        loadingGuardar={crear.isPending || editar.isPending}
        loadingConfirmar={crear.isPending || editar.isPending || confirmar.isPending}
        error={errorFormulario}
      />

      <ComprobanteDetalleModal
        idComprobante={detalleId}
        onClose={cerrarDetalle}
        onEditar={(comprobante) => {
          cerrarDetalle()
          setErrorFormulario(null)
          setFormulario({ modo: 'editar', comprobante })
        }}
        onAnular={(comprobante) => {
          cerrarDetalle()
          setErrorAnular(null)
          setAnular({
            id: comprobante.id_comprobante_proveedor,
            numero: formatearNumeroComprobante(comprobante),
          })
        }}
      />

      <AnularComprobanteModal
        open={anular !== null}
        numero={anular?.numero ?? ''}
        onCancel={() => {
          setAnular(null)
          setErrorAnular(null)
        }}
        onConfirm={ejecutarAnular}
        loading={anularMutation.isPending}
        error={errorAnular}
      />

      <ConfirmDialog
        open={confirmarFila !== null}
        onCancel={() => {
          setConfirmarFila(null)
          setErrorConfirmarFila(null)
        }}
        onConfirm={ejecutarConfirmarFila}
        variant="reactivar"
        eyebrow="Confirmar y registrar"
        title={
          confirmarFila
            ? `¿Confirmar y registrar el comprobante ${formatearNumeroComprobante(confirmarFila)}?`
            : ''
        }
        note="Una vez registrado, la cabecera y el detalle dejan de poder editarse. El comprobante debe tener al menos una línea."
        confirmLabel="Confirmar y registrar"
        loading={confirmar.isPending}
        error={errorConfirmarFila ? formatearMensajeError(errorConfirmarFila.message) : null}
      />
    </div>
  )
}