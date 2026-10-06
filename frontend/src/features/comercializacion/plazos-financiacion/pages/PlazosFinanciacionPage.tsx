import { useEffect, useState } from 'react'
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
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { FiltroEstadoPlazosBar } from '../components/FiltroEstadoPlazosBar'
import { PlazoFinanciacionForm } from '../components/PlazoFinanciacionForm'
import { COLUMNAS_PLAZOS_FINANCIACION, LIMITE_PAGINA } from '../config/plazoFinanciacion.config'
import {
  useCrearPlazoFinanciacion,
  useDarDeBajaPlazoFinanciacion,
  useEditarPlazoFinanciacion,
  usePlazosFinanciacion,
  useReactivarPlazoFinanciacion,
} from '../hooks/usePlazosFinanciacion'
import type { PlazoFinanciacionFormOutput } from '../types/plazoFinanciacion.schema'
import type {
  FiltroEstado,
  ModoFormulario,
  PlazoFinanciacion,
} from '../types/plazoFinanciacion.types'
import { DECIMALES_TNA, formatearTasa } from '../utils/tasa'

/**
 * Qué tiene abierto el formulario. `plazo` va siempre menos en INSERCIÓN: en
 * EDICIÓN y LECTURA el modal precarga con los datos de la fila.
 */
type EstadoFormulario =
  { modo: 'insercion' } | { modo: 'edicion' | 'lectura'; plazo: PlazoFinanciacion }

type TipoConfirmacion = 'baja' | 'reactivar'
type EstadoConfirmacion = { tipo: TipoConfirmacion; plazo: PlazoFinanciacion } | null

export function PlazosFinanciacionPage() {
  const navigate = useNavigate()
  const toast = useToast()

  // El listado abre mostrando solo los activos, que son los que se ofrecen en
  // las ventas. Los dados de baja siguen a un cambio de filtro.
  const [estado, setEstado] = useState<FiltroEstado>('true')
  const [page, setPage] = useState(1)
  const [formulario, setFormulario] = useState<EstadoFormulario | null>(null)
  const [errorFormulario, setErrorFormulario] = useState<ApiErrorResponse | null>(null)
  const [confirmacion, setConfirmacion] = useState<EstadoConfirmacion>(null)
  const [errorConfirmacion, setErrorConfirmacion] = useState<ApiErrorResponse | null>(null)

  // Con otro filtro, la página en la que estaba parado el usuario puede no
  // existir más: siempre se vuelve a la primera.
  function cambiarEstado(nuevoEstado: FiltroEstado) {
    setEstado(nuevoEstado)
    setPage(1)
  }

  const { data, isLoading, isFetching, error, refetch } = usePlazosFinanciacion({
    // El estado viaja siempre: omitirlo no trae todos, trae solo los activos.
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
  // quedaba en la página (ej. dar de baja con el filtro en "Activos"). En vez
  // de dejar la tabla en blanco, se retrocede una página; si esa también quedó
  // vacía, el efecto vuelve a correr hasta llegar a la primera.
  useEffect(() => {
    if (isFetching || !data) return
    if (data.data.length === 0 && data.meta.page > 1) setPage(data.meta.page - 1)
  }, [isFetching, data])

  const crear = useCrearPlazoFinanciacion()
  const editar = useEditarPlazoFinanciacion()
  const baja = useDarDeBajaPlazoFinanciacion()
  const reactivar = useReactivarPlazoFinanciacion()

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
        toast.error('El plazo de financiación ya no existe')
        cerrar()
        refetch()
        return true
      default:
        return false
    }
  }

  /**
   * Lo que sí puede corregir desde el formulario — el 409 de la cantidad de
   * cuotas repetida, el 400 de validación y los de servidor — baja al
   * `PlazoFinanciacionForm`, que los pinta sin perder lo cargado.
   */
  function manejarErrorFormulario(error: ApiErrorResponse) {
    if (manejarErrorComun(error, cerrarFormulario)) return

    setErrorFormulario(error)
  }

  function manejarSubmitFormulario(payload: PlazoFinanciacionFormOutput) {
    if (formulario?.modo === 'insercion') {
      const descripcion = payload.descripcion?.trim() ?? ''

      crear.mutate(
        // En el alta la descripción vacía se omite: el backend la deja en null.
        {
          cantidad_cuotas: payload.cantidad_cuotas,
          tasa_nominal_anual: payload.tasa_nominal_anual,
          ...(descripcion ? { descripcion } : {}),
        },
        {
          onSuccess: () => {
            toast.success('Plazo de financiación creado correctamente')
            cerrarFormulario()
            // El plazo nuevo puede caer en cualquier página del orden por
            // cuotas; se vuelve a la primera, con el filtro puesto.
            setPage(1)
          },
          onError: manejarErrorFormulario,
        }
      )
      return
    }

    if (formulario?.modo === 'edicion') {
      editar.mutate(
        // Acá la descripción viaja siempre, incluso vacía: es la única forma de
        // borrar la que tenía. La cantidad de cuotas no viaja nunca: queda
        // bloqueada desde el alta.
        {
          id: formulario.plazo.id_plazo_financiacion,
          payload: {
            tasa_nominal_anual: payload.tasa_nominal_anual,
            descripcion: payload.descripcion?.trim() ?? '',
          },
        },
        {
          onSuccess: () => {
            toast.success('Plazo de financiación actualizado correctamente')
            cerrarFormulario()
          },
          onError: manejarErrorFormulario,
        }
      )
    }
  }

  const esBaja = confirmacion?.tipo === 'baja'
  const operacionEnCurso = baja.isPending || reactivar.isPending

  function manejarErrorConfirmacion(error: ApiErrorResponse) {
    if (manejarErrorComun(error, cerrarConfirmacion)) return

    // Un 409 significa que la fila que se ve está vieja (ya estaba en el
    // estado pedido) o que reactivar chocaría con otro plazo activo de la misma
    // cantidad de cuotas: se refresca el listado aunque el diálogo siga abierto.
    if (error.statusCode === 409) refetch()

    setErrorConfirmacion(error)
  }

  function ejecutarConfirmacion() {
    if (!confirmacion) return

    const { tipo, plazo } = confirmacion
    const mutacion = tipo === 'baja' ? baja : reactivar

    setErrorConfirmacion(null)
    mutacion.mutate(plazo.id_plazo_financiacion, {
      onSuccess: () => {
        toast.success(
          tipo === 'baja'
            ? 'Plazo de financiación dado de baja correctamente'
            : 'Plazo de financiación reactivado correctamente'
        )
        cerrarConfirmacion()
      },
      onError: manejarErrorConfirmacion,
    })
  }

  /**
   * Mientras la operación corre, el botón que la disparó queda bloqueado con su
   * spinner: no se puede mandar la misma baja dos veces.
   */
  function accionEnCurso(plazo: PlazoFinanciacion): RowAction | undefined {
    if (!confirmacion || !operacionEnCurso) return undefined
    if (confirmacion.plazo.id_plazo_financiacion !== plazo.id_plazo_financiacion) return undefined

    return confirmacion.tipo === 'baja' ? 'delete' : 'reactivate'
  }

  const columnas: DataTableColumn<PlazoFinanciacion>[] = [
    ...COLUMNAS_PLAZOS_FINANCIACION,
    {
      key: 'acciones',
      label: 'Acciones',
      render: (item) => (
        <RowActions
          isActive={item.estado}
          loadingAction={accionEnCurso(item)}
          // La fila ya trae todo lo que el formulario muestra; el detalle solo
          // se pide en LECTURA, para la auditoría.
          onView={() => abrirFormulario({ modo: 'lectura', plazo: item })}
          onEdit={() => abrirFormulario({ modo: 'edicion', plazo: item })}
          // Baja y reactivación son excluyentes: `RowActions` muestra una u otra
          // según `isActive`.
          onDelete={() => abrirConfirmacion({ tipo: 'baja', plazo: item })}
          onReactivate={() => abrirConfirmacion({ tipo: 'reactivar', plazo: item })}
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

  const plazos = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FiltroEstadoPlazosBar estado={estado} onEstadoChange={cambiarEstado} />
        <Button icon={<Plus />} onClick={() => abrirFormulario({ modo: 'insercion' })}>
          Nuevo plazo
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

      {!isLoading && !error && plazos.length === 0 && (
        <EmptyState
          titulo="No se encontraron plazos de financiación"
          descripcion="Probá ajustar el filtro de estado o cargá un plazo nuevo."
        />
      )}

      {!isLoading && !error && plazos.length > 0 && (
        <>
          <DataTable
            data={plazos}
            columns={columnas}
            obtenerId={(item) => String(item.id_plazo_financiacion)}
            ariaLabel="Plazos de financiación"
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

      <PlazoFinanciacionForm
        open={formulario !== null}
        onClose={cerrarFormulario}
        modo={modoDelFormulario(formulario)}
        plazo={formulario && formulario.modo !== 'insercion' ? formulario.plazo : undefined}
        onSubmit={manejarSubmitFormulario}
        // Mismo formulario y mismo estado que el lápiz de la fila: el modo
        // lectura pasa a edición con ese registro.
        onEditar={(plazo) => abrirFormulario({ modo: 'edicion', plazo })}
        loading={crear.isPending || editar.isPending}
        error={errorFormulario}
      />

      <ConfirmDialog
        open={confirmacion !== null}
        onCancel={cerrarConfirmacion}
        onConfirm={ejecutarConfirmacion}
        variant={esBaja ? 'baja' : 'reactivar'}
        eyebrow={esBaja ? 'Dar de baja plazo de financiación' : 'Reactivar plazo de financiación'}
        title={
          confirmacion
            ? `¿Confirmás que querés ${esBaja ? 'dar de baja' : 'reactivar'} el plazo de ${confirmacion.plazo.cantidad_cuotas} ${confirmacion.plazo.cantidad_cuotas === 1 ? 'cuota' : 'cuotas'}?`
            : ''
        }
        details={confirmacion ? detallesConfirmacion(confirmacion.plazo) : undefined}
        note={
          esBaja && !errorConfirmacion
            ? 'La baja es lógica: el plazo deja de ofrecerse en nuevas ventas, en los planes de ejemplo y en el simulador del catálogo, pero las ventas que lo usaron lo conservan.'
            : undefined
        }
        // El mensaje del backend se muestra tal cual: en la reactivación es lo
        // único que distingue "ya estaba activo" de "esa cantidad de cuotas ya
        // la tiene otro plazo activo".
        error={errorConfirmacion ? formatearMensajeError(errorConfirmacion.message) : null}
        // Ningún conflicto se arregla reintentando lo mismo: solo queda cerrar.
        hideConfirm={errorConfirmacion?.statusCode === 409}
        confirmLabel={esBaja ? 'Dar de baja' : 'Reactivar'}
        cancelLabel={errorConfirmacion?.statusCode === 409 ? 'Cerrar' : 'Cancelar'}
        loading={operacionEnCurso}
      />
    </div>
  )
}

/**
 * El modo que recibe el formulario. Con el modal cerrado (`null`) no se
 * renderiza, así que el valor no se usa: se deja el de alta, que no necesita
 * un plazo.
 */
function modoDelFormulario(formulario: EstadoFormulario | null): ModoFormulario {
  return formulario?.modo ?? 'insercion'
}

/** Los datos del plazo que se listan dentro del diálogo de baja o reactivación. */
function detallesConfirmacion(plazo: PlazoFinanciacion) {
  return [
    { label: 'Código', value: plazo.codigo },
    { label: 'Cantidad de cuotas', value: String(plazo.cantidad_cuotas) },
    { label: 'TNA', value: formatearTasa(plazo.tasa_nominal_anual, DECIMALES_TNA) },
  ]
}
