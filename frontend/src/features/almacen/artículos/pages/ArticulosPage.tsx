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
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { ArticuloDetalleModal } from '../components/ArticuloDetalleModal'
import { ArticuloForm } from '../components/ArticuloForm'
import { FiltrosArticulosBar } from '../components/FiltrosArticulosBar'
import { COLUMNAS_ARTICULOS, DEBOUNCE_BUSQUEDA, LIMITE_PAGINA } from '../config/articulo.config'
import {
  useArticulos,
  useCrearArticulo,
  useDarDeBajaArticulo,
  useEditarArticulo,
  useReactivarArticulo,
} from '../hooks/useArticulos'
import type { ArticuloFormOutput } from '../types/articulo.schema'
import type { Articulo, FiltroEstado } from '../types/articulo.types'

type EstadoFormulario = { modo: 'crear' } | { modo: 'editar'; articulo: Articulo } | null

type TipoConfirmacion = 'baja' | 'reactivar'
type EstadoConfirmacion = { tipo: TipoConfirmacion; articulo: Articulo } | null

export function ArticulosPage() {
  const toast = useToast()
  const navigate = useNavigate()

  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('')
  const [marca, setMarca] = useState('')
  const [estado, setEstado] = useState<FiltroEstado>('')
  const [page, setPage] = useState(1)
  const [detalleId, setDetalleId] = useState<number | null>(null)
  const [formulario, setFormulario] = useState<EstadoFormulario>(null)
  const [errorFormulario, setErrorFormulario] = useState<ApiErrorResponse | null>(null)
  const [confirmacion, setConfirmacion] = useState<EstadoConfirmacion>(null)
  const [errorConfirmacion, setErrorConfirmacion] = useState<ApiErrorResponse | null>(null)

  const busquedaDebounced = useDebounce(busqueda.trim(), DEBOUNCE_BUSQUEDA)

  // Con otros filtros, la página en la que estaba parado el usuario puede no
  // existir más: siempre se vuelve a la primera.
  useEffect(() => {
    setPage(1)
  }, [busquedaDebounced, categoria, marca, estado])

  const { data, isFetching, error, refetch } = useArticulos({
    busqueda: busquedaDebounced || undefined,
    FK_Categoria: categoria === '' ? undefined : Number(categoria),
    FK_Marca: marca === '' ? undefined : Number(marca),
    estado: estado === '' ? undefined : estado === 'true',
    page,
    limit: LIMITE_PAGINA,
  })

  const statusCode = error?.statusCode
  const hayFiltrosAplicados =
    busquedaDebounced !== '' || categoria !== '' || marca !== '' || estado !== ''

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

  const crear = useCrearArticulo()
  const editar = useEditarArticulo()
  const baja = useDarDeBajaArticulo()
  const reactivar = useReactivarArticulo()

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
        toast.error('El artículo ya no existe')
        cerrar()
        refetch()
        return true
      default:
        return false
    }
  }

  /**
   * Lo que sí puede corregir desde el formulario — 400, 409 y los de servidor —
   * baja al `ArticuloForm`, que los pinta sin perder lo cargado.
   */
  function manejarErrorFormulario(error: ApiErrorResponse) {
    if (manejarErrorComun(error, cerrarFormulario)) return

    setErrorFormulario(error)
  }

  function manejarSubmitFormulario(payload: ArticuloFormOutput) {
    const descripcion = payload.descripcion?.trim() ?? ''

    if (formulario?.modo === 'crear') {
      crear.mutate(
        {
          nombre: payload.nombre,
          FK_Categoria: payload.FK_Categoria,
          FK_UnidadMedida: payload.FK_UnidadMedida,
          // En el alta la descripción vacía y la marca sin elegir se omiten:
          // el backend los deja en null.
          ...(descripcion ? { descripcion } : {}),
          ...(payload.FK_Marca !== null ? { FK_Marca: payload.FK_Marca } : {}),
        },
        {
          onSuccess: () => {
            toast.success('Artículo creado correctamente')
            cerrarFormulario()
            // El artículo nuevo puede caer en cualquier página del orden
            // alfabético; se vuelve a la primera, con los filtros que estaban puestos.
            setPage(1)
          },
          onError: manejarErrorFormulario,
        }
      )
      return
    }

    if (formulario?.modo === 'editar') {
      editar.mutate(
        {
          id: formulario.articulo.id_articulo,
          payload: {
            // Acá la descripción viaja siempre, incluso vacía: es la única
            // forma de borrar la que tenía. Lo mismo para la marca: `null`
            // explícito es como se quita la asignada.
            nombre: payload.nombre,
            descripcion,
            FK_Categoria: payload.FK_Categoria,
            FK_UnidadMedida: payload.FK_UnidadMedida,
            FK_Marca: payload.FK_Marca,
          },
        },
        {
          onSuccess: () => {
            toast.success('Artículo actualizado correctamente')
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
  // se puede destrabar editando el artículo.
  const soloCerrar = motivoConflicto !== null && motivoConflicto !== 'nombre-duplicado'

  function manejarErrorConfirmacion(error: ApiErrorResponse, tipo: TipoConfirmacion) {
    if (manejarErrorComun(error, cerrarConfirmacion)) return

    // Que el artículo ya estuviera en el estado pedido significa que la fila
    // que se ve está vieja: se refresca el listado aunque el diálogo siga abierto.
    if (motivoDelConflicto(tipo, error) === 'estado-desactualizado') refetch()

    setErrorConfirmacion(error)
  }

  function ejecutarConfirmacion() {
    if (!confirmacion) return

    const { tipo, articulo } = confirmacion
    const mutacion = tipo === 'baja' ? baja : reactivar

    setErrorConfirmacion(null)
    mutacion.mutate(articulo.id_articulo, {
      onSuccess: () => {
        toast.success(
          tipo === 'baja'
            ? 'Artículo dado de baja correctamente'
            : 'Artículo reactivado correctamente'
        )
        cerrarConfirmacion()
      },
      onError: (error) => manejarErrorConfirmacion(error, tipo),
    })
  }

  function manejarAccionPrincipal() {
    if (!confirmacion) return

    // Con el nombre tomado por otro artículo activo, reactivar de nuevo va a
    // fallar igual: el botón pasa a llevar al formulario para cambiarlo.
    if (motivoConflicto === 'nombre-duplicado') {
      const { articulo } = confirmacion
      cerrarConfirmacion()
      abrirFormulario({ modo: 'editar', articulo })
      return
    }

    ejecutarConfirmacion()
  }

  /**
   * Mientras la operación corre, el botón que la disparó queda bloqueado con su
   * spinner: no se puede mandar la misma baja dos veces.
   */
  function accionEnCurso(articulo: Articulo): RowAction | undefined {
    if (!confirmacion || !operacionEnCurso) return undefined
    if (confirmacion.articulo.id_articulo !== articulo.id_articulo) return undefined

    return confirmacion.tipo === 'baja' ? 'delete' : 'reactivate'
  }

  const columnas: DataTableColumn<Articulo>[] = [
    ...COLUMNAS_ARTICULOS,
    {
      key: 'acciones',
      label: 'Acciones',
      render: (item) => (
        <RowActions
          isActive={item.estado}
          loadingAction={accionEnCurso(item)}
          onView={() => setDetalleId(item.id_articulo)}
          onEdit={() => abrirFormulario({ modo: 'editar', articulo: item })}
          onDelete={() => abrirConfirmacion({ tipo: 'baja', articulo: item })}
          onReactivate={() => abrirConfirmacion({ tipo: 'reactivar', articulo: item })}
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

  const articulos = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FiltrosArticulosBar
          busqueda={busqueda}
          onBusquedaChange={setBusqueda}
          categoria={categoria}
          onCategoriaChange={setCategoria}
          marca={marca}
          onMarcaChange={setMarca}
          estado={estado}
          onEstadoChange={setEstado}
        />
        <Button icon={<Plus />} onClick={() => abrirFormulario({ modo: 'crear' })}>
          Nuevo Artículo
        </Button>
      </div>

      {error && statusCode !== 401 ? (
        <ErrorState
          mensaje={
            statusCode === 400
              ? 'Los filtros aplicados no son válidos. Se reinició la paginación.'
              : formatearMensajeError(error.message)
          }
          onReintentar={() => refetch()}
        />
      ) : !isFetching && articulos.length === 0 ? (
        <EmptyState
          titulo={
            hayFiltrosAplicados
              ? 'No se encontraron artículos con esos criterios'
              : 'Todavía no hay artículos cargados'
          }
        />
      ) : (
        <>
          <DataTable
            data={articulos}
            columns={columnas}
            obtenerId={(item) => String(item.id_articulo)}
            loading={isFetching}
            skeletonRows={LIMITE_PAGINA}
            ariaLabel="Artículos"
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

      <ArticuloForm
        open={formulario !== null}
        onClose={cerrarFormulario}
        articulo={formulario?.modo === 'editar' ? formulario.articulo : undefined}
        onSubmit={manejarSubmitFormulario}
        loading={crear.isPending || editar.isPending}
        error={errorFormulario}
      />

      <ArticuloDetalleModal
        idArticulo={detalleId}
        onClose={cerrarDetalle}
        onEditar={(articulo) => {
          cerrarDetalle()
          abrirFormulario({ modo: 'editar', articulo })
        }}
      />

      <ConfirmDialog
        open={confirmacion !== null}
        onCancel={cerrarConfirmacion}
        onConfirm={manejarAccionPrincipal}
        variant={esBaja ? 'baja' : 'reactivar'}
        eyebrow={esBaja ? 'Dar de baja artículo' : 'Reactivar artículo'}
        title={
          confirmacion
            ? `¿Confirmás que querés ${esBaja ? 'dar de baja' : 'reactivar'} el artículo «${confirmacion.articulo.nombre}»?`
            : ''
        }
        note={notaConfirmacion(esBaja, motivoConflicto)}
        error={errorConfirmacion ? formatearMensajeError(errorConfirmacion.message) : null}
        hideConfirm={soloCerrar}
        confirmLabel={
          motivoConflicto === 'nombre-duplicado'
            ? 'Editar artículo'
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
  // Reactivar un artículo vuelve a validar su nombre entre activos: mientras
  // estuvo de baja, otro pudo haber tomado ese mismo nombre.
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
      return 'Se actualizó el listado con el estado real del artículo.'
    case 'nombre-duplicado':
      return 'Editá el nombre del artículo antes de reactivarlo.'
    case null:
      return esBaja ? 'Podrás reactivarlo más adelante.' : undefined
    default:
      return undefined
  }
}
