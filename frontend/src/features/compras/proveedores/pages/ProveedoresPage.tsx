import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, ShieldAlert } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { DataTable } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import type { RowAction } from '@/shared/components/common/RowActions'
import { RowActions } from '@/shared/components/common/RowActions'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Button } from '@/shared/components/ui/Button'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { FiltrosProveedoresBar } from '../components/FiltrosProveedoresBar'
import { ProveedorDetalleModal } from '../components/ProveedorDetalleModal'
import { ProveedorForm } from '../components/ProveedorForm'
import {
  DEBOUNCE_BUSQUEDA,
  LIMITE_PAGINA,
  crearColumnasProveedores,
} from '../config/proveedor.config'
import {
  useCondicionesIva,
  useCrearProveedor,
  useDarDeBajaProveedor,
  useProveedores,
  useReactivarProveedor,
} from '../hooks/useProveedores'
import type { ProveedorFormOutput } from '../types/proveedor.schema'
import type { FiltroEstado, Proveedor } from '../types/proveedor.types'

type TipoConfirmacion = 'baja' | 'reactivar'
type EstadoConfirmacion = { tipo: TipoConfirmacion; proveedor: Proveedor } | null

export function ProveedoresPage() {
  const toast = useToast()
  const navigate = useNavigate()

  const [busqueda, setBusqueda] = useState('')
  const [condicionIva, setCondicionIva] = useState('')
  // El listado abre mostrando solo los activos, que son con los que se trabaja
  // todos los días. Los dados de baja se ven cambiando el filtro a "Todos".
  const [estado, setEstado] = useState<FiltroEstado>('true')
  const [page, setPage] = useState(1)
  const [detalleId, setDetalleId] = useState<number | null>(null)
  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const [errorFormulario, setErrorFormulario] = useState<ApiErrorResponse | null>(null)
  const [confirmacion, setConfirmacion] = useState<EstadoConfirmacion>(null)
  const [errorConfirmacion, setErrorConfirmacion] = useState<ApiErrorResponse | null>(null)

  const busquedaDebounced = useDebounce(busqueda.trim(), DEBOUNCE_BUSQUEDA)

  // Con otros filtros, la página en la que estaba parado el usuario puede no
  // existir más: siempre se vuelve a la primera.
  useEffect(() => {
    setPage(1)
  }, [busquedaDebounced, condicionIva, estado])

  const { data, isLoading, isFetching, error, refetch } = useProveedores({
    busqueda: busquedaDebounced || undefined,
    condicionIva: condicionIva || undefined,
    estado,
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

  // Una baja puede sacar del filtro a la última fila que quedaba en la página
  // (ej. dar de baja con el filtro en "Activos"). En vez de dejar la tabla en
  // blanco, se retrocede una página; si esa también quedó vacía, el efecto
  // vuelve a correr hasta llegar a la primera.
  useEffect(() => {
    if (isFetching || !data) return
    if (data.data.length === 0 && data.meta.page > 1) setPage(data.meta.page - 1)
  }, [isFetching, data])

  // Para la columna de la tabla: traduce el `id` de cada fila al `code` del
  // catálogo. Mientras el catálogo no llegó, o para un `id` que no está en él,
  // se muestra el id tal cual.
  const { data: condicionesIva } = useCondicionesIva()
  const etiquetasCondicionIva = useMemo(
    () => new Map(condicionesIva?.map((item) => [item.id, item.code])),
    [condicionesIva]
  )
  const cerrarDetalle = useCallback(() => setDetalleId(null), [])

  const crear = useCrearProveedor()
  const baja = useDarDeBajaProveedor()
  const reactivar = useReactivarProveedor()
  const operacionEnCurso = baja.isPending || reactivar.isPending

  /**
   * Mientras la operación corre, el botón que la disparó queda bloqueado con su
   * spinner: no se puede mandar la misma baja/reactivación dos veces.
   */
  function accionEnCurso(proveedor: Proveedor): RowAction | undefined {
    if (!confirmacion || !operacionEnCurso) return undefined
    if (confirmacion.proveedor.id_proveedor !== proveedor.id_proveedor) return undefined

    return confirmacion.tipo === 'baja' ? 'delete' : 'reactivate'
  }

  const columnas: DataTableColumn<Proveedor>[] = [
    ...crearColumnasProveedores((id) => etiquetasCondicionIva.get(id) ?? id),
    {
      key: 'acciones',
      label: 'Acciones',
      render: (item) => (
        <RowActions
          isActive={item.estado}
          loadingAction={accionEnCurso(item)}
          onView={() => setDetalleId(item.id_proveedor)}
          onDelete={() => abrirConfirmacion({ tipo: 'baja', proveedor: item })}
          onReactivate={() => abrirConfirmacion({ tipo: 'reactivar', proveedor: item })}
        />
      ),
    },
  ]

  function abrirFormulario() {
    setErrorFormulario(null)
    setFormularioAbierto(true)
  }

  function cerrarFormulario() {
    setFormularioAbierto(false)
    setErrorFormulario(null)
  }

  /**
   * Los errores que no dependen de lo que el usuario haya cargado se resuelven
   * igual venga de donde venga: se avisa y se cierra lo que estuviera abierto.
   * Devuelve `true` si se hizo cargo, para que quien llama sepa si le queda
   * algo por hacer.
   */
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
        toast.error('El proveedor ya no existe')
        cerrar()
        refetch()
        return true
      default:
        return false
    }
  }

  function manejarSubmitFormulario(payload: ProveedorFormOutput) {
    crear.mutate(
      {
        razon_social: payload.razon_social,
        cuit: payload.cuit,
        condicion_iva: payload.condicion_iva,
        ...(payload.domicilio ? { domicilio: payload.domicilio } : {}),
        ...(payload.telefono ? { telefono: payload.telefono } : {}),
        ...(payload.correo ? { correo: payload.correo } : {}),
        ...(payload.observaciones ? { observaciones: payload.observaciones } : {}),
      },
      {
        onSuccess: () => {
          toast.success('Proveedor creado correctamente')
          cerrarFormulario()
          // El proveedor nuevo puede caer en cualquier página del orden
          // alfabético; se vuelve a la primera, con los filtros que estaban puestos.
          setPage(1)
        },
        onError: (error) => {
          if (manejarErrorComun(error, cerrarFormulario)) return
          setErrorFormulario(error)
        },
      }
    )
  }

  function abrirConfirmacion(estadoInicial: EstadoConfirmacion) {
    setErrorConfirmacion(null)
    setConfirmacion(estadoInicial)
  }

  function cerrarConfirmacion() {
    setConfirmacion(null)
    setErrorConfirmacion(null)
  }

  function ejecutarConfirmacion() {
    if (!confirmacion) return

    const { tipo, proveedor } = confirmacion
    const mutacion = tipo === 'baja' ? baja : reactivar

    setErrorConfirmacion(null)
    mutacion.mutate(proveedor.id_proveedor, {
      onSuccess: () => {
        toast.success(
          tipo === 'baja'
            ? 'Proveedor dado de baja correctamente'
            : 'Proveedor reactivado correctamente'
        )
        cerrarConfirmacion()
      },
      onError: (error) => {
        if (manejarErrorComun(error, cerrarConfirmacion)) return
        setErrorConfirmacion(error)
      },
    })
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

  const proveedores = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FiltrosProveedoresBar
          busqueda={busqueda}
          onBusquedaChange={setBusqueda}
          condicionIva={condicionIva}
          onCondicionIvaChange={setCondicionIva}
          estado={estado}
          onEstadoChange={setEstado}
        />
        <Button icon={<Plus />} onClick={abrirFormulario}>
          Nuevo Proveedor
        </Button>
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

      {!isLoading && !error && proveedores.length === 0 && (
        <EmptyState
          titulo="No se encontraron proveedores"
          descripcion="Probá ajustar los filtros de búsqueda."
        />
      )}

      {!isLoading && !error && proveedores.length > 0 && (
        <>
          <DataTable
            data={proveedores}
            columns={columnas}
            obtenerId={(item) => String(item.id_proveedor)}
            ariaLabel="Proveedores"
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

      <ProveedorForm
        open={formularioAbierto}
        onClose={cerrarFormulario}
        onSubmit={manejarSubmitFormulario}
        loading={crear.isPending}
        error={errorFormulario}
      />

      <ProveedorDetalleModal idProveedor={detalleId} onClose={cerrarDetalle} />

      <ConfirmDialog
        open={confirmacion !== null}
        onCancel={cerrarConfirmacion}
        onConfirm={ejecutarConfirmacion}
        variant={confirmacion?.tipo === 'baja' ? 'baja' : 'reactivar'}
        eyebrow={confirmacion?.tipo === 'baja' ? 'Dar de baja proveedor' : 'Reactivar proveedor'}
        title={
          confirmacion
            ? `¿Confirmás que querés ${confirmacion.tipo === 'baja' ? 'dar de baja al' : 'reactivar al'} proveedor «${confirmacion.proveedor.razon_social}»?`
            : ''
        }
        error={errorConfirmacion ? formatearMensajeError(errorConfirmacion.message) : null}
        confirmLabel={confirmacion?.tipo === 'baja' ? 'Dar de baja' : 'Reactivar'}
        loading={operacionEnCurso}
      />
    </div>
  )
}
