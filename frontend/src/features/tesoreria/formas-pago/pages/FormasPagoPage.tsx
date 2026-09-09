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
import { FiltrosFormasPagoBar } from '../components/FiltrosFormasPagoBar'
import { FormaPagoDetalleModal } from '../components/FormaPagoDetalleModal'
import { FormaPagoForm } from '../components/FormaPagoForm'
import { COLUMNAS_FORMAS_PAGO, DEBOUNCE_BUSQUEDA, LIMITE_PAGINA } from '../config/formaPago.config'
import {
  useCrearFormaPago,
  useDarDeBajaFormaPago,
  useEditarFormaPago,
  useFormasPago,
  useReactivarFormaPago,
} from '../hooks/useFormasPago'
import type { FormaPagoFormOutput } from '../types/formaPago.schema'
import type { FiltroEstado, FormaPago } from '../types/formaPago.types'
import { formatearCodigoFormaPago } from '../utils/codigoFormaPago'

type EstadoFormulario = { modo: 'crear' } | { modo: 'editar'; formaPago: FormaPago } | null

type TipoConfirmacion = 'baja' | 'reactivar'
type EstadoConfirmacion = { tipo: TipoConfirmacion; formaPago: FormaPago } | null

export function FormasPagoPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [nombre, setNombre] = useState('')
  // El listado abre mostrando solo las activas, que son con las que se trabaja
  // todos los días. Las dadas de baja siguen a un cambio de filtro.
  const [estado, setEstado] = useState<FiltroEstado>('true')
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
  }, [nombreDebounced, estado])

  const { data, isLoading, isFetching, error, refetch } = useFormasPago({
    nombre: nombreDebounced || undefined,
    // El estado viaja siempre: omitirlo no trae todas, trae solo las activas.
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

  // Una baja o una reactivación puede sacar del filtro a la última fila que
  // quedaba en la página (ej. dar de baja con el filtro en "Activas"). En vez de
  // dejar la tabla en blanco, se retrocede una página; si esa también quedó
  // vacía, el efecto vuelve a correr hasta llegar a la primera.
  useEffect(() => {
    if (isFetching || !data) return
    if (data.data.length === 0 && data.meta.page > 1) setPage(data.meta.page - 1)
  }, [isFetching, data])

  const cerrarDetalle = useCallback(() => setDetalleId(null), [])

  const crear = useCrearFormaPago()
  const editar = useEditarFormaPago()
  const baja = useDarDeBajaFormaPago()
  const reactivar = useReactivarFormaPago()

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
        toast.error('La forma de pago ya no existe')
        cerrar()
        refetch()
        return true
      default:
        return false
    }
  }

  /**
   * Lo que sí puede corregir desde el formulario — el 409 del nombre repetido,
   * el 400 de validación y los de servidor — baja al `FormaPagoForm`, que los
   * pinta sin perder lo cargado.
   */
  function manejarErrorFormulario(error: ApiErrorResponse) {
    if (manejarErrorComun(error, cerrarFormulario)) return

    setErrorFormulario(error)
  }

  function manejarSubmitFormulario(payload: FormaPagoFormOutput) {
    const descripcion = payload.descripcion?.trim() ?? ''

    if (formulario?.modo === 'crear') {
      crear.mutate(
        // En el alta la descripción vacía se omite: el backend la deja en null.
        {
          nombre: payload.nombre,
          requiere_referencia: payload.requiere_referencia,
          ...(descripcion ? { descripcion } : {}),
        },
        {
          onSuccess: () => {
            toast.success('Forma de pago creada correctamente')
            cerrarFormulario()
            // La forma nueva puede caer en cualquier página del orden
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
        // borrar la que tenía. El indicador de referencia no viaja nunca: no es
        // editable.
        {
          id: formulario.formaPago.id_forma_pago,
          payload: { nombre: payload.nombre, descripcion },
        },
        {
          onSuccess: () => {
            toast.success('Forma de pago actualizada correctamente')
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
  // se puede destrabar editando la forma de pago.
  const soloCerrar = motivoConflicto !== null && motivoConflicto !== 'nombre-duplicado'

  function manejarErrorConfirmacion(error: ApiErrorResponse, tipo: TipoConfirmacion) {
    if (manejarErrorComun(error, cerrarConfirmacion)) return

    // Que la forma ya estuviera en el estado pedido significa que la fila que se
    // ve está vieja: se refresca el listado aunque el diálogo siga abierto.
    if (motivoDelConflicto(tipo, error) === 'estado-desactualizado') refetch()

    setErrorConfirmacion(error)
  }

  function ejecutarConfirmacion() {
    if (!confirmacion) return

    const { tipo, formaPago } = confirmacion
    const mutacion = tipo === 'baja' ? baja : reactivar

    setErrorConfirmacion(null)
    mutacion.mutate(formaPago.id_forma_pago, {
      onSuccess: () => {
        toast.success(
          tipo === 'baja'
            ? 'Forma de pago dada de baja correctamente'
            : 'Forma de pago reactivada correctamente'
        )
        cerrarConfirmacion()
      },
      onError: (error) => manejarErrorConfirmacion(error, tipo),
    })
  }

  function manejarAccionPrincipal() {
    if (!confirmacion) return

    // Con el nombre tomado por otra forma activa, reactivar de nuevo va a fallar
    // igual: el botón pasa a llevar al formulario para cambiarlo.
    if (motivoConflicto === 'nombre-duplicado') {
      const { formaPago } = confirmacion
      cerrarConfirmacion()
      abrirFormulario({ modo: 'editar', formaPago })
      return
    }

    ejecutarConfirmacion()
  }

  /**
   * Mientras la operación corre, el botón que la disparó queda bloqueado con su
   * spinner: no se puede mandar la misma baja dos veces.
   */
  function accionEnCurso(formaPago: FormaPago): RowAction | undefined {
    if (!confirmacion || !operacionEnCurso) return undefined
    if (confirmacion.formaPago.id_forma_pago !== formaPago.id_forma_pago) return undefined

    return confirmacion.tipo === 'baja' ? 'delete' : 'reactivate'
  }

  const columnas: DataTableColumn<FormaPago>[] = [
    ...COLUMNAS_FORMAS_PAGO,
    {
      key: 'acciones',
      label: 'Acciones',
      render: (item) => (
        <RowActions
          isActive={item.estado}
          loadingAction={accionEnCurso(item)}
          // Tanto el detalle como la edición se piden por id, no por el código
          // que muestra la tabla.
          onView={() => setDetalleId(item.id_forma_pago)}
          // La fila del listado ya trae todo lo editable (nombre, descripción) y
          // el indicador que se muestra bloqueado: no hace falta pedir el
          // detalle para precargar el formulario.
          onEdit={() => abrirFormulario({ modo: 'editar', formaPago: item })}
          // Baja y reactivación son excluyentes: `RowActions` muestra una u otra
          // según `isActive`.
          onDelete={() => abrirConfirmacion({ tipo: 'baja', formaPago: item })}
          onReactivate={() => abrirConfirmacion({ tipo: 'reactivar', formaPago: item })}
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

  const formasPago = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FiltrosFormasPagoBar
          nombre={nombre}
          onNombreChange={setNombre}
          estado={estado}
          onEstadoChange={setEstado}
        />
        <Button icon={<Plus />} onClick={() => abrirFormulario({ modo: 'crear' })}>
          Nueva forma de pago
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

      {!isLoading && !error && formasPago.length === 0 && (
        <EmptyState
          titulo="No se encontraron formas de pago"
          descripcion="Probá ajustar los filtros de búsqueda."
        />
      )}

      {!isLoading && !error && formasPago.length > 0 && (
        <>
          <DataTable
            data={formasPago}
            columns={columnas}
            obtenerId={(item) => String(item.id_forma_pago)}
            ariaLabel="Formas de pago"
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

      <FormaPagoForm
        open={formulario !== null}
        onClose={cerrarFormulario}
        formaPago={formulario?.modo === 'editar' ? formulario.formaPago : undefined}
        onSubmit={manejarSubmitFormulario}
        loading={crear.isPending || editar.isPending}
        error={errorFormulario}
      />

      <FormaPagoDetalleModal
        idFormaPago={detalleId}
        onClose={cerrarDetalle}
        // Mismo formulario y mismo handler que el lápiz de la fila: el detalle
        // se cierra y queda abierto el de edición con ese registro.
        onEditar={(formaPago) => {
          cerrarDetalle()
          abrirFormulario({ modo: 'editar', formaPago })
        }}
      />

      <ConfirmDialog
        open={confirmacion !== null}
        onCancel={cerrarConfirmacion}
        onConfirm={manejarAccionPrincipal}
        variant={esBaja ? 'baja' : 'reactivar'}
        eyebrow={esBaja ? 'Dar de baja forma de pago' : 'Reactivar forma de pago'}
        title={
          confirmacion
            ? `¿Confirmás que querés ${esBaja ? 'dar de baja' : 'reactivar'} la forma de pago «${confirmacion.formaPago.nombre}»?`
            : ''
        }
        details={confirmacion ? detallesConfirmacion(confirmacion.formaPago) : undefined}
        note={notaConfirmacion(esBaja, motivoConflicto)}
        // El mensaje del backend se muestra tal cual: en la reactivación es lo
        // único que distingue "ya estaba activa" de "el nombre está tomado".
        error={errorConfirmacion ? formatearMensajeError(errorConfirmacion.message) : null}
        hideConfirm={soloCerrar}
        confirmLabel={
          motivoConflicto === 'nombre-duplicado'
            ? 'Editar forma de pago'
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

/** Los datos de la forma de pago que se listan dentro del diálogo. */
function detallesConfirmacion(formaPago: FormaPago) {
  return [
    { label: 'Código', value: formatearCodigoFormaPago(formaPago.id_forma_pago) },
    { label: 'Nombre', value: formaPago.nombre },
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
    return mensaje.includes('ya está dada de baja') ? 'estado-desactualizado' : 'otro'
  }

  if (mensaje.includes('ya está activa')) return 'estado-desactualizado'
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
      return 'Se actualizó el listado con el estado real de la forma de pago.'
    case 'nombre-duplicado':
      return 'Editá el nombre de la forma de pago antes de reactivarla.'
    case null:
      return esBaja
        ? 'La baja es lógica: la forma de pago deja de estar disponible para nuevas órdenes de pago, pero las históricas no se tocan.'
        : undefined
    default:
      return undefined
  }
}
