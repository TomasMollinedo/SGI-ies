import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Pencil, Plus, ShieldAlert } from 'lucide-react'
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
import { FiltrosTiposComprobanteBar } from '../components/FiltrosTiposComprobanteBar'
import { TipoComprobanteDetalleModal } from '../components/TipoComprobanteDetalleModal'
import { TipoComprobanteForm } from '../components/TipoComprobanteForm'
import {
  COLUMNAS_TIPOS_COMPROBANTE,
  DEBOUNCE_BUSQUEDA,
  LIMITE_PAGINA,
} from '../config/tipoComprobante.config'
import {
  useCrearTipoComprobante,
  useDarDeBajaTipoComprobante,
  useEditarTipoComprobante,
  useReactivarTipoComprobante,
  useTiposComprobante,
} from '../hooks/useTiposComprobante'
import type { TipoComprobanteFormOutput } from '../types/tipoComprobante.schema'
import type { FiltroEfectoSaldo, FiltroEstado, TipoComprobante } from '../types/tipoComprobante.types'
import { formatearCodigoTipoComprobante } from '../utils/codigoTipoComprobante'

type EstadoFormulario =
  { modo: 'crear' } | { modo: 'editar'; tipoComprobante: TipoComprobante } | null

type TipoConfirmacion = 'baja' | 'reactivar'
type EstadoConfirmacion = { tipo: TipoConfirmacion; tipoComprobante: TipoComprobante } | null

export function TiposComprobantePage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [nombre, setNombre] = useState('')
  // El listado abre mostrando solo los activos, que son con los que se trabaja
  // todos los días. Los dados de baja siguen a un cambio de filtro.
  const [estado, setEstado] = useState<FiltroEstado>('true')
  const [efectoSaldo, setEfectoSaldo] = useState<FiltroEfectoSaldo>('')
  const [page, setPage] = useState(1)
  const [detalleId, setDetalleId] = useState<number | null>(null)
  const [formulario, setFormulario] = useState<EstadoFormulario>(null)
  const [errorFormulario, setErrorFormulario] = useState<ApiErrorResponse | null>(null)
  const [confirmacion, setConfirmacion] = useState<EstadoConfirmacion>(null)
  const [errorConfirmacion, setErrorConfirmacion] = useState<ApiErrorResponse | null>(null)

  const nombreDebounced = useDebounce(nombre.trim(), DEBOUNCE_BUSQUEDA)

  // Con otros filtros, la página en la que estaba parado el usuario puede no
  // existir más: siempre se vuelve a la primera.
  useEffect(() => {
    setPage(1)
  }, [nombreDebounced, estado, efectoSaldo])

  const { data, isLoading, isFetching, error, refetch } = useTiposComprobante({
    nombre: nombreDebounced || undefined,
    estado: estado === '' ? undefined : estado === 'true',
    aumentaSaldo: efectoSaldo === '' ? undefined : efectoSaldo === 'true',
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

  // Una baja o una reactivación puede sacar del filtro a la última fila que
  // quedaba en la página (ej. dar de baja con el filtro en "Activo"). En vez de
  // dejar la tabla en blanco, se retrocede una página; si esa también quedó
  // vacía, el efecto vuelve a correr hasta llegar a la primera.
  useEffect(() => {
    if (isFetching || !data) return
    if (data.data.length === 0 && data.meta.page > 1) setPage(data.meta.page - 1)
  }, [isFetching, data])

  const cerrarDetalle = useCallback(() => setDetalleId(null), [])

  const crear = useCrearTipoComprobante()
  const editar = useEditarTipoComprobante()
  const baja = useDarDeBajaTipoComprobante()
  const reactivar = useReactivarTipoComprobante()

  function abrirFormulario(estadoInicial: EstadoFormulario) {
    setErrorFormulario(null)
    setFormulario(estadoInicial)
  }

  function cerrarFormulario() {
    setFormulario(null)
    setErrorFormulario(null)
  }

  function abrirConfirmacion(estadoInicial: EstadoConfirmacion) {
    setErrorConfirmacion(null)
    setConfirmacion(estadoInicial)
  }

  function cerrarConfirmacion() {
    setConfirmacion(null)
    setErrorConfirmacion(null)
  }

  /**
   * Los errores que no dependen de lo que el usuario haya cargado se resuelven
   * igual venga de donde venga: se avisa, se cierra lo que estuviera abierto y,
   * si la fila quedó desactualizada, se refresca. Devuelve `true` si se hizo
   * cargo, para que quien llama sepa si le queda algo por hacer.
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
        toast.error('El tipo de comprobante ya no existe')
        cerrar()
        refetch()
        return true
      default:
        return false
    }
  }

  /**
   * Lo que sí puede corregir desde el formulario — el 409 del nombre repetido,
   * el 400 de validación y los de servidor — baja al `TipoComprobanteForm`, que
   * los pinta sin perder lo cargado.
   */
  function manejarErrorFormulario(error: ApiErrorResponse) {
    if (manejarErrorComun(error, cerrarFormulario)) return

    setErrorFormulario(error)
  }

  function manejarSubmitFormulario(payload: TipoComprobanteFormOutput) {
    const descripcion = payload.descripcion?.trim() ?? ''

    if (formulario?.modo === 'crear') {
      crear.mutate(
        // En el alta la descripción vacía se omite: el backend la deja en null.
        {
          nombre: payload.nombre,
          aumenta_saldo: payload.aumenta_saldo,
          requiere_comprobante_origen: payload.requiere_comprobante_origen,
          ...(descripcion ? { descripcion } : {}),
        },
        {
          onSuccess: () => {
            toast.success('Tipo de comprobante creado correctamente')
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
        // borrar la que tenía. Los indicadores no viajan nunca: no son editables.
        {
          id: formulario.tipoComprobante.id_tipo_comprobante,
          payload: { nombre: payload.nombre, descripcion },
        },
        {
          onSuccess: () => {
            toast.success('Tipo de comprobante actualizado correctamente')
            cerrarFormulario()
          },
          onError: manejarErrorFormulario,
        }
      )
    }
  }

  const esBaja = confirmacion?.tipo === 'baja'
  const operacionEnCurso = baja.isPending || reactivar.isPending

  // El 409 es el único error que se interpreta: según el motivo, el diálogo
  // ofrece cosas distintas. El resto se muestra tal cual y se puede reintentar.
  const motivoConflicto =
    confirmacion && errorConfirmacion
      ? motivoDelConflicto(confirmacion.tipo, errorConfirmacion)
      : null

  // Ningún conflicto se arregla reintentando lo mismo; el del nombre al menos
  // se puede destrabar editando el tipo de comprobante.
  const soloCerrar = motivoConflicto !== null && motivoConflicto !== 'nombre-duplicado'

  function manejarErrorConfirmacion(error: ApiErrorResponse, tipo: TipoConfirmacion) {
    if (manejarErrorComun(error, cerrarConfirmacion)) return

    // Que el tipo ya estuviera en el estado pedido significa que la fila que se
    // ve está vieja: se refresca el listado aunque el diálogo siga abierto.
    if (motivoDelConflicto(tipo, error) === 'estado-desactualizado') refetch()

    setErrorConfirmacion(error)
  }

  function ejecutarConfirmacion() {
    if (!confirmacion) return

    const { tipo, tipoComprobante } = confirmacion
    const mutacion = tipo === 'baja' ? baja : reactivar

    setErrorConfirmacion(null)
    mutacion.mutate(tipoComprobante.id_tipo_comprobante, {
      onSuccess: () => {
        toast.success(
          tipo === 'baja'
            ? 'Tipo de comprobante dado de baja correctamente'
            : 'Tipo de comprobante reactivado correctamente'
        )
        cerrarConfirmacion()
      },
      onError: (error) => manejarErrorConfirmacion(error, tipo),
    })
  }

  function manejarAccionPrincipal() {
    if (!confirmacion) return

    // Con el nombre tomado por otro tipo activo, reactivar de nuevo va a fallar
    // igual: el botón pasa a llevar al formulario para cambiarlo.
    if (motivoConflicto === 'nombre-duplicado') {
      const { tipoComprobante } = confirmacion
      cerrarConfirmacion()
      abrirFormulario({ modo: 'editar', tipoComprobante })
      return
    }

    ejecutarConfirmacion()
  }

  /**
   * Mientras la operación corre, el botón que la disparó queda bloqueado con su
   * spinner: no se puede mandar la misma baja dos veces.
   */
  function accionEnCurso(tipoComprobante: TipoComprobante): RowAction | undefined {
    if (!confirmacion || !operacionEnCurso) return undefined
    if (confirmacion.tipoComprobante.id_tipo_comprobante !== tipoComprobante.id_tipo_comprobante) {
      return undefined
    }

    return confirmacion.tipo === 'baja' ? 'delete' : 'reactivate'
  }

  const columnas: DataTableColumn<TipoComprobante>[] = [
    ...COLUMNAS_TIPOS_COMPROBANTE,
    {
      key: 'acciones',
      label: 'Acciones',
      render: (item) => (
        <RowActions
          isActive={item.estado}
          loadingAction={accionEnCurso(item)}
          // Tanto el detalle como la edición se piden por id, no por el código
          // que muestra la tabla.
          onView={() => setDetalleId(item.id_tipo_comprobante)}
          // La fila del listado ya trae todo lo editable (nombre, descripción)
          // y los indicadores que se muestran bloqueados: no hace falta pedir
          // el detalle para precargar el formulario.
          onEdit={() => abrirFormulario({ modo: 'editar', tipoComprobante: item })}
          // Baja y reactivación son excluyentes: `RowActions` muestra una u
          // otra según `isActive`.
          onDelete={() => abrirConfirmacion({ tipo: 'baja', tipoComprobante: item })}
          onReactivate={() => abrirConfirmacion({ tipo: 'reactivar', tipoComprobante: item })}
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

  const tiposComprobante = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FiltrosTiposComprobanteBar
          nombre={nombre}
          onNombreChange={setNombre}
          estado={estado}
          onEstadoChange={setEstado}
          efectoSaldo={efectoSaldo}
          onEfectoSaldoChange={setEfectoSaldo}
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

      {!isLoading && !error && tiposComprobante.length === 0 && (
        <EmptyState
          titulo="No se encontraron tipos de comprobante"
          descripcion="Probá ajustar los filtros de búsqueda."
        />
      )}

      {!isLoading && !error && tiposComprobante.length > 0 && (
        <>
          <DataTable
            data={tiposComprobante}
            columns={columnas}
            obtenerId={(item) => String(item.id_tipo_comprobante)}
            ariaLabel="Tipos de comprobante"
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

      <TipoComprobanteForm
        open={formulario !== null}
        onClose={cerrarFormulario}
        tipoComprobante={formulario?.modo === 'editar' ? formulario.tipoComprobante : undefined}
        onSubmit={manejarSubmitFormulario}
        loading={crear.isPending || editar.isPending}
        error={errorFormulario}
      />

      <TipoComprobanteDetalleModal
        idTipoComprobante={detalleId}
        onClose={cerrarDetalle}
        // Mismo formulario y mismo handler que el lápiz de la fila: el detalle
        // se cierra y queda abierto el de edición con ese registro.
        onEditar={(tipoComprobante) => {
          cerrarDetalle()
          abrirFormulario({ modo: 'editar', tipoComprobante })
        }}
      />

      <ConfirmDialog
        open={confirmacion !== null}
        onCancel={cerrarConfirmacion}
        onConfirm={manejarAccionPrincipal}
        variant={esBaja ? 'baja' : 'reactivar'}
        eyebrow={esBaja ? 'Dar de baja tipo de comprobante' : 'Reactivar tipo de comprobante'}
        title={
          confirmacion
            ? `¿Confirmás que querés ${esBaja ? 'dar de baja' : 'reactivar'} el tipo de comprobante «${confirmacion.tipoComprobante.nombre}»?`
            : ''
        }
        details={confirmacion ? detallesConfirmacion(confirmacion.tipoComprobante) : undefined}
        note={notaConfirmacion(esBaja, motivoConflicto)}
        // El mensaje del backend se muestra tal cual: en la reactivación es lo
        // único que distingue "ya estaba activo" de "el nombre está tomado".
        error={errorConfirmacion ? formatearMensajeError(errorConfirmacion.message) : null}
        hideConfirm={soloCerrar}
        confirmLabel={
          motivoConflicto === 'nombre-duplicado'
            ? 'Editar tipo'
            : esBaja
              ? 'Dar de baja'
              : 'Reactivar'
        }
        confirmIcon={motivoConflicto === 'nombre-duplicado' ? <Pencil /> : undefined}
        cancelLabel={soloCerrar ? 'Cerrar' : 'Cancelar'}
        loading={operacionEnCurso}
      />
    </div>
  )
}

/** Los datos del tipo de comprobante que se listan dentro del diálogo. */
function detallesConfirmacion(tipoComprobante: TipoComprobante) {
  return [
    { label: 'Código', value: formatearCodigoTipoComprobante(tipoComprobante.id_tipo_comprobante) },
    { label: 'Nombre', value: tipoComprobante.nombre },
  ]
}

/** Por qué el backend rechazó la baja o la reactivación con un 409. */
type MotivoConflicto = 'estado-desactualizado' | 'nombre-duplicado' | 'otro'

/**
 * El 409 no trae un código de motivo, solo el texto, así que se reconoce por
 * ahí. Lo que no se reconoce cae en `'otro'`: el mensaje del backend se muestra
 * igual, que es lo que importa; lo único que se pierde es la acción a medida.
 */
function motivoDelConflicto(
  tipo: TipoConfirmacion,
  error: ApiErrorResponse
): MotivoConflicto | null {
  if (error.statusCode !== 409) return null

  const mensaje = formatearMensajeError(error.message).toLowerCase()

  if (tipo === 'baja') {
    return mensaje.includes('ya está dado de baja') ? 'estado-desactualizado' : 'otro'
  }

  if (mensaje.includes('ya está activo')) return 'estado-desactualizado'
  if (mensaje.includes('ya existe')) return 'nombre-duplicado'
  return 'otro'
}

/**
 * La aclaración de abajo del título. Antes de confirmar tranquiliza sobre lo
 * que se está por hacer; después de un conflicto pasa a decir cómo seguir.
 */
function notaConfirmacion(esBaja: boolean, motivo: MotivoConflicto | null): string | undefined {
  switch (motivo) {
    case 'estado-desactualizado':
      return 'Se actualizó el listado con el estado real del tipo de comprobante.'
    case 'nombre-duplicado':
      return 'Editá el nombre del tipo de comprobante antes de reactivarlo.'
    case null:
      return esBaja
        ? 'La baja es lógica: el tipo deja de estar disponible para nuevos comprobantes, pero los históricos no se tocan.'
        : undefined
    default:
      return undefined
  }
}
