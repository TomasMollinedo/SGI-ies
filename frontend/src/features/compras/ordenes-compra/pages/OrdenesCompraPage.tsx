import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Plus, ShieldAlert } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { DataTable } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { AccionesOrdenCompraRow } from '../components/AccionesOrdenCompraRow'
import { CambiarEstadoOrdenCompraModal } from '../components/CambiarEstadoOrdenCompraModal'
import { FiltrosOrdenesCompraBar } from '../components/FiltrosOrdenesCompraBar'
import { OrdenCompraDetalleModal } from '../components/OrdenCompraDetalleModal'
import { OrdenCompraForm } from '../components/OrdenCompraForm'
import { COLUMNAS_ORDENES_COMPRA, ESTADO_META, LIMITE_PAGINA } from '../config/ordenCompra.config'
import {
  useCambiarEstadoOrdenCompra,
  useCrearOrdenCompra,
  useEditarOrdenCompra,
  useOrdenCompraDetalle,
  useOrdenesCompra,
} from '../hooks/useOrdenesCompra'
import type { OrdenCompraFormOutput } from '../types/ordenCompra.schema'
import type {
  CrearOrdenCompraPayload,
  EstadoOrdenCompra,
  OrdenCompra,
  OrdenCompraListItem,
} from '../types/ordenCompra.types'
import { formatearCodigoOrdenCompra } from '../utils/codigoOrdenCompra'

const ESTADOS_VALIDOS: EstadoOrdenCompra[] = [
  'BORRADOR',
  'EMITIDA',
  'RECIBIDA_PARCIAL',
  'RECIBIDA',
  'CANCELADA',
]

function esEstadoValido(valor: string): valor is EstadoOrdenCompra {
  return ESTADOS_VALIDOS.includes(valor as EstadoOrdenCompra)
}

function construirPayload(payload: OrdenCompraFormOutput): CrearOrdenCompraPayload {
  return {
    fecha_emision: payload.fecha_emision,
    fecha_entrega_solicitada: payload.fecha_entrega_solicitada || undefined,
    observaciones: payload.observaciones || undefined,
    FK_proveedor: payload.FK_proveedor,
    FK_deposito: payload.FK_deposito,
    detalle: payload.detalle,
  }
}

type EstadoFormulario = { modo: 'crear' } | { modo: 'editar'; orden: OrdenCompra } | null

/**
 * Listado de órdenes de compra (T69): columnas, filtros combinables por
 * proveedor/estado/período y acceso al detalle de cada fila. Sumado al alta
 * de T68 (la modal "Nueva orden de compra").
 *
 * Los filtros viven en la URL (`useSearchParams`) y no en `useState`: es la
 * única forma de que sobrevivan a un F5, que es justo lo que pide el "Listo
 * cuando" de la HU. La página, sin recibirlos, no se entera de nada especial.
 */
export function OrdenesCompraPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [searchParams, setSearchParams] = useSearchParams()
  const FK_proveedor = searchParams.get('proveedor') ?? ''
  const estadoParam = searchParams.get('estado') ?? ''
  const estado = esEstadoValido(estadoParam) ? estadoParam : ''
  const fechaDesde = searchParams.get('desde') ?? ''
  const fechaHasta = searchParams.get('hasta') ?? ''

  const [page, setPage] = useState(1)
  const [detalleId, setDetalleId] = useState<number | null>(null)
  const [formulario, setFormulario] = useState<EstadoFormulario>(null)
  const [errorFormulario, setErrorFormulario] = useState<ApiErrorResponse | null>(null)
  const [idParaEditar, setIdParaEditar] = useState<number | null>(null)
  const [avanceFila, setAvanceFila] = useState<OrdenCompraListItem | null>(null)
  const [errorAvanceFila, setErrorAvanceFila] = useState<ApiErrorResponse | null>(null)

  const rangoInvalido = fechaDesde !== '' && fechaHasta !== '' && fechaDesde > fechaHasta
  const hayFiltros = FK_proveedor !== '' || estado !== '' || fechaDesde !== '' || fechaHasta !== ''

  /** Pisa solo los campos que cambiaron; el resto de la URL queda igual. `''` borra el parámetro. */
  function actualizarFiltros(cambios: Record<string, string>) {
    setSearchParams(
      (actuales) => {
        const siguientes = new URLSearchParams(actuales)
        for (const [clave, valor] of Object.entries(cambios)) {
          if (valor === '') siguientes.delete(clave)
          else siguientes.set(clave, valor)
        }
        return siguientes
      },
      { replace: true }
    )
  }

  // Con otros filtros, la página en la que estaba parado el usuario puede no
  // existir más: siempre se vuelve a la primera.
  useEffect(() => {
    setPage(1)
  }, [FK_proveedor, estado, fechaDesde, fechaHasta])

  const { data, isLoading, isFetching, error, refetch } = useOrdenesCompra({
    FK_proveedor: FK_proveedor === '' ? undefined : Number(FK_proveedor),
    estado: estado === '' ? undefined : estado,
    fechaDesde: rangoInvalido || fechaDesde === '' ? undefined : fechaDesde,
    fechaHasta: rangoInvalido || fechaHasta === '' ? undefined : fechaHasta,
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

  const crear = useCrearOrdenCompra()
  const editar = useEditarOrdenCompra()
  const cambiarEstado = useCambiarEstadoOrdenCompra()
  const cambiarEstadoFila = useCambiarEstadoOrdenCompra()

  // Al tocar "editar" en una fila BORRADOR, se pide el detalle (la fila no
  // trae las líneas) y recién con eso se abre el formulario en modo edición.
  const detalleParaEditar = useOrdenCompraDetalle(idParaEditar)
  useEffect(() => {
    if (idParaEditar === null) return
    if (detalleParaEditar.data) {
      setErrorFormulario(null)
      setFormulario({ modo: 'editar', orden: detalleParaEditar.data })
      setIdParaEditar(null)
      return
    }
    if (detalleParaEditar.error) {
      toast.error(formatearMensajeError(detalleParaEditar.error.message))
      setIdParaEditar(null)
    }
  }, [idParaEditar, detalleParaEditar.data, detalleParaEditar.error, toast])

  function cerrarFormulario() {
    setFormulario(null)
    setErrorFormulario(null)
  }

  function manejarGuardarBorrador(payload: OrdenCompraFormOutput) {
    setErrorFormulario(null)

    if (formulario?.modo === 'editar') {
      editar.mutate(
        { id: formulario.orden.id_orden_compra, payload: construirPayload(payload) },
        {
          onSuccess: (orden) => {
            toast.success(`Orden de compra ${formatearCodigoOrdenCompra(orden.id_orden_compra)} actualizada.`)
            cerrarFormulario()
          },
          onError: (error) => setErrorFormulario(error),
        }
      )
      return
    }

    crear.mutate(construirPayload(payload), {
      onSuccess: (orden) => {
        toast.success(
          `Orden de compra ${formatearCodigoOrdenCompra(orden.id_orden_compra)} guardada como borrador.`
        )
        cerrarFormulario()
        setPage(1)
      },
      onError: (error) => setErrorFormulario(error),
    })
  }

  // Confirmar y emitir es un alta o edición (BORRADOR) seguida del cambio de
  // estado a EMITIDA: son las llamadas que ya expone el backend, no un
  // endpoint nuevo.
  function manejarConfirmarYEmitir(payload: OrdenCompraFormOutput) {
    setErrorFormulario(null)

    const alGuardar = (orden: OrdenCompra) => {
      cambiarEstado.mutate(
        { id: orden.id_orden_compra, payload: { estado: 'EMITIDA' } },
        {
          onSuccess: () => {
            toast.success(
              `Orden de compra ${formatearCodigoOrdenCompra(orden.id_orden_compra)} confirmada y emitida.`
            )
            cerrarFormulario()
          },
          onError: (error) => setErrorFormulario(error),
        }
      )
    }

    if (formulario?.modo === 'editar') {
      editar.mutate(
        { id: formulario.orden.id_orden_compra, payload: construirPayload(payload) },
        { onSuccess: alGuardar, onError: (error) => setErrorFormulario(error) }
      )
      return
    }

    crear.mutate(construirPayload(payload), {
      onSuccess: (orden) => {
        alGuardar(orden)
        setPage(1)
      },
      onError: (error) => setErrorFormulario(error),
    })
  }

  function ejecutarAvanceFila(destino: EstadoOrdenCompra, observacion: string) {
    if (!avanceFila) return

    setErrorAvanceFila(null)
    cambiarEstadoFila.mutate(
      {
        id: avanceFila.id_orden_compra,
        payload: {
          estado: destino,
          motivo_cancelacion: destino === 'CANCELADA' ? observacion : undefined,
          observacion: observacion || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(
            `Orden ${formatearCodigoOrdenCompra(avanceFila.id_orden_compra)} marcada como ${ESTADO_META[destino].label.toLowerCase()}.`
          )
          setAvanceFila(null)
        },
        onError: (error) => setErrorAvanceFila(error),
      }
    )
  }

  const operando =
    crear.isPending || editar.isPending || cambiarEstado.isPending || cambiarEstadoFila.isPending

  const columnas: DataTableColumn<OrdenCompraListItem>[] = [
    ...COLUMNAS_ORDENES_COMPRA,
    {
      key: 'acciones',
      label: 'Acciones',
      render: (item) => (
        <AccionesOrdenCompraRow
          orden={item}
          bloqueado={operando || idParaEditar !== null}
          onVer={() => setDetalleId(item.id_orden_compra)}
          onEditar={() => setIdParaEditar(item.id_orden_compra)}
          onCambiarEstado={() => {
            setErrorAvanceFila(null)
            setAvanceFila(item)
          }}
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

  const ordenes = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  return (
    <div className="space-y-4">
      <FiltrosOrdenesCompraBar
        FK_proveedor={FK_proveedor}
        onFKProveedorChange={(valor) => actualizarFiltros({ proveedor: valor })}
        estado={estado}
        onEstadoChange={(valor) => actualizarFiltros({ estado: valor })}
        fechaDesde={fechaDesde}
        onFechaDesdeChange={(valor) => actualizarFiltros({ desde: valor })}
        fechaHasta={fechaHasta}
        onFechaHastaChange={(valor) => actualizarFiltros({ hasta: valor })}
        errorRango={
          rangoInvalido ? 'La fecha desde no puede ser posterior a la fecha hasta' : undefined
        }
        onLimpiar={() => actualizarFiltros({ proveedor: '', estado: '', desde: '', hasta: '' })}
        hayFiltros={hayFiltros}
        acciones={
          <Button icon={<Plus />} onClick={() => setFormulario({ modo: 'crear' })}>
            Nueva orden de compra
          </Button>
        }
      />

      {error && statusCode !== 401 ? (
        <ErrorState
          mensaje={
            statusCode === 400
              ? 'Los filtros aplicados no son válidos. Se reinició la paginación.'
              : formatearMensajeError(error.message)
          }
          onReintentar={() => refetch()}
        />
      ) : (
        <>
          {!isLoading && ordenes.length === 0 && (
            <EmptyState
              titulo={
                hayFiltros
                  ? 'No se encontraron órdenes de compra con esos filtros'
                  : 'Todavía no hay órdenes de compra cargadas'
              }
              descripcion={
                hayFiltros
                  ? 'Probá ajustar el proveedor, el estado o el período.'
                  : 'Cargá la primera con «Nueva orden de compra».'
              }
            />
          )}

          {(isLoading || ordenes.length > 0) && (
            <>
              <DataTable
                data={ordenes}
                columns={columnas}
                obtenerId={(item) => String(item.id_orden_compra)}
                loading={isLoading}
                ariaLabel="Órdenes de compra"
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
        </>
      )}

      <OrdenCompraForm
        open={formulario !== null}
        onClose={cerrarFormulario}
        orden={formulario?.modo === 'editar' ? formulario.orden : undefined}
        onGuardarBorrador={manejarGuardarBorrador}
        onConfirmarYEmitir={manejarConfirmarYEmitir}
        loadingBorrador={crear.isPending || editar.isPending}
        loadingConfirmar={crear.isPending || editar.isPending || cambiarEstado.isPending}
        error={errorFormulario}
      />

      <OrdenCompraDetalleModal idOrdenCompra={detalleId} onClose={() => setDetalleId(null)} />

      <CambiarEstadoOrdenCompraModal
        orden={avanceFila}
        onCancel={() => {
          setAvanceFila(null)
          setErrorAvanceFila(null)
        }}
        onConfirm={ejecutarAvanceFila}
        loading={cambiarEstadoFila.isPending}
        error={errorAvanceFila}
      />
    </div>
  )
}
