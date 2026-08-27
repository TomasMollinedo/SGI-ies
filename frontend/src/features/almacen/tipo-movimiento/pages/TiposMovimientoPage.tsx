import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, ShieldAlert } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { DataTable } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import { RowActions } from '@/shared/components/common/RowActions'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Button } from '@/shared/components/ui/Button'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { FiltrosTiposMovimientoBar } from '../components/FiltrosTiposMovimientoBar'
import { TipoMovimientoDetalleModal } from '../components/TipoMovimientoDetalleModal'
import { TipoMovimientoForm } from '../components/TipoMovimientoForm'
import {
  COLUMNAS_TIPOS_MOVIMIENTO,
  DEBOUNCE_BUSQUEDA,
  LIMITE_PAGINA,
} from '../config/tipoMovimiento.config'
import {
  useCrearTipoMovimiento,
  useEditarTipoMovimiento,
  useTiposMovimiento,
} from '../hooks/useTiposMovimiento'
import type { TipoMovimientoFormOutput } from '../types/tipoMovimiento.schema'
import type { FiltroEstado, FiltroIndicador, TipoMovimiento } from '../types/tipoMovimiento.types'

type EstadoFormulario =
  { modo: 'crear' } | { modo: 'editar'; tipoMovimiento: TipoMovimiento } | null

export function TiposMovimientoPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [nombre, setNombre] = useState('')
  // El listado abre mostrando solo los activos, que son con los que se trabaja
  // todos los días. Los dados de baja siguen a un cambio de filtro.
  const [estado, setEstado] = useState<FiltroEstado>('true')
  const [indicador, setIndicador] = useState<FiltroIndicador>('')
  const [page, setPage] = useState(1)
  const [detalleId, setDetalleId] = useState<number | null>(null)
  const [formulario, setFormulario] = useState<EstadoFormulario>(null)
  const [errorFormulario, setErrorFormulario] = useState<ApiErrorResponse | null>(null)

  const nombreDebounced = useDebounce(nombre.trim(), DEBOUNCE_BUSQUEDA)

  // Con otros filtros, la página en la que estaba parado el usuario puede no
  // existir más: siempre se vuelve a la primera.
  useEffect(() => {
    setPage(1)
  }, [nombreDebounced, estado, indicador])

  const { data, isLoading, isFetching, error, refetch } = useTiposMovimiento({
    nombre: nombreDebounced || undefined,
    // `estado` viaja siempre: sin el parámetro el backend devuelve solo los
    // activos, así que omitirlo nunca mostraría los dados de baja.
    estado: estado === 'true',
    indicadorEntrada: indicador === '' ? undefined : indicador === 'true',
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

  const cerrarDetalle = useCallback(() => setDetalleId(null), [])

  const crear = useCrearTipoMovimiento()
  const editar = useEditarTipoMovimiento()

  function abrirFormulario(estadoInicial: EstadoFormulario) {
    setErrorFormulario(null)
    setFormulario(estadoInicial)
  }

  function cerrarFormulario() {
    setFormulario(null)
    setErrorFormulario(null)
  }

  /**
   * Los errores que no dependen de lo que el usuario haya cargado se resuelven
   * igual venga de donde venga: se avisa, se cierra el formulario y, si la fila
   * quedó desactualizada, se refresca. Devuelve `true` si se hizo cargo, para
   * que quien llama sepa si le queda algo por hacer.
   */
  function manejarErrorComun(error: ApiErrorResponse): boolean {
    switch (error.statusCode) {
      case 401:
        navigate(PATHS.LOGIN, { replace: true })
        return true
      case 403:
        toast.error('No tenés permisos para realizar esta acción')
        cerrarFormulario()
        return true
      case 404:
        toast.error('El tipo de movimiento ya no existe')
        cerrarFormulario()
        refetch()
        return true
      default:
        return false
    }
  }

  /**
   * Lo que sí puede corregir desde el formulario — el 409 del nombre repetido,
   * el 400 de validación y los de servidor — baja al `TipoMovimientoForm`, que
   * los pinta sin perder lo cargado.
   */
  function manejarErrorFormulario(error: ApiErrorResponse) {
    if (manejarErrorComun(error)) return

    setErrorFormulario(error)
  }

  function manejarSubmitFormulario(payload: TipoMovimientoFormOutput) {
    const descripcion = payload.descripcion?.trim() ?? ''

    if (formulario?.modo === 'crear') {
      crear.mutate(
        // En el alta la descripción vacía se omite: el backend la deja en null.
        {
          nombre: payload.nombre,
          indicador_entrada: payload.indicador_entrada,
          ...(descripcion ? { descripcion } : {}),
        },
        {
          onSuccess: () => {
            toast.success('Tipo de movimiento creado correctamente')
            cerrarFormulario()
            // El tipo nuevo puede caer en cualquier página del orden
            // alfabético; se vuelve a la primera, con los filtros puestos.
            setPage(1)
          },
          onError: manejarErrorFormulario,
        }
      )
      return
    }

    if (formulario?.modo === 'editar') {
      editar.mutate(
        // Acá la descripción viaja siempre, incluso vacía: es la única forma de
        // borrar la que tenía. El indicador no viaja nunca: no es editable.
        {
          id: formulario.tipoMovimiento.id_tipo_movimiento,
          payload: { nombre: payload.nombre, descripcion },
        },
        {
          onSuccess: () => {
            toast.success('Tipo de movimiento actualizado correctamente')
            cerrarFormulario()
          },
          onError: manejarErrorFormulario,
        }
      )
    }
  }

  /**
   * La baja y la reactivación son de otro ticket: las acciones ya quedan
   * cableadas para que ahí alcance con completar estos handlers.
   */
  function manejarBaja() {
    // TODO: confirmar y dar de baja el tipo de movimiento.
  }

  function manejarReactivar() {
    // TODO: confirmar y reactivar el tipo de movimiento.
  }

  const columnas: DataTableColumn<TipoMovimiento>[] = [
    ...COLUMNAS_TIPOS_MOVIMIENTO,
    {
      key: 'acciones',
      label: 'Acciones',
      render: (item) => (
        <RowActions
          isActive={item.estado}
          // Tanto el detalle como la edición se piden por id, no por el código
          // que muestra la tabla.
          onView={() => setDetalleId(item.id_tipo_movimiento)}
          // La fila del listado ya trae todo lo editable (nombre, descripción)
          // y el indicador que se muestra bloqueado: no hace falta pedir el
          // detalle para precargar el formulario.
          onEdit={() => abrirFormulario({ modo: 'editar', tipoMovimiento: item })}
          onDelete={manejarBaja}
          onReactivate={manejarReactivar}
        />
      ),
    },
  ]

  if (statusCode === 403) {
    return (
      <EmptyState
        icono={ShieldAlert}
        titulo="No tenés permisos para acceder a esta sección"
        descripcion="Se requiere el rol Responsable de Almacén."
      />
    )
  }

  const tiposMovimiento = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FiltrosTiposMovimientoBar
          nombre={nombre}
          onNombreChange={setNombre}
          estado={estado}
          onEstadoChange={setEstado}
          indicador={indicador}
          onIndicadorChange={setIndicador}
        />
        <Button icon={<Plus />} onClick={() => abrirFormulario({ modo: 'crear' })}>
          Nuevo tipo
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

      {!isLoading && !error && tiposMovimiento.length === 0 && (
        <EmptyState
          titulo="No se encontraron tipos de movimiento"
          descripcion="Probá ajustar los filtros de búsqueda."
        />
      )}

      {!isLoading && !error && tiposMovimiento.length > 0 && (
        <>
          <DataTable
            data={tiposMovimiento}
            columns={columnas}
            obtenerId={(item) => String(item.id_tipo_movimiento)}
            ariaLabel="Tipos de movimiento"
          />

          {meta && (
            <Pagination
              currentPage={meta.page}
              totalPages={totalPaginas}
              totalItems={meta.total}
              pageSize={meta.limit}
              onPageChange={setPage}
              disabled={isFetching}
              className="justify-center"
            />
          )}
        </>
      )}

      <TipoMovimientoForm
        open={formulario !== null}
        onClose={cerrarFormulario}
        tipoMovimiento={formulario?.modo === 'editar' ? formulario.tipoMovimiento : undefined}
        onSubmit={manejarSubmitFormulario}
        loading={crear.isPending || editar.isPending}
        error={errorFormulario}
      />

      <TipoMovimientoDetalleModal
        idTipoMovimiento={detalleId}
        onClose={cerrarDetalle}
        // Mismo formulario y mismo handler que el lápiz de la fila: el detalle
        // se cierra y queda abierto el de edición con ese registro.
        onEditar={(tipoMovimiento) => {
          cerrarDetalle()
          abrirFormulario({ modo: 'editar', tipoMovimiento })
        }}
      />
    </div>
  )
}
