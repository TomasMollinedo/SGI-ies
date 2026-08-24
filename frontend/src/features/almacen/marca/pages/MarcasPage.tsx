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
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { FiltrosMarcasBar } from '../components/FiltrosMarcasBar'
import { MarcaDetalleModal } from '../components/MarcaDetalleModal'
import { MarcaForm } from '../components/MarcaForm'
import { COLUMNAS_MARCAS, DEBOUNCE_BUSQUEDA, LIMITE_PAGINA } from '../config/marca.config'
import { useCrearMarca, useEditarMarca, useMarcas } from '../hooks/useMarcas'
import type { MarcaFormOutput } from '../types/marca.schema'
import type { FiltroEstado, Marca } from '../types/marca.types'

type EstadoFormulario = { modo: 'crear' } | { modo: 'editar'; marca: Marca } | null

export function MarcasPage() {
  const toast = useToast()
  const navigate = useNavigate()

  const [nombre, setNombre] = useState('')
  const [estado, setEstado] = useState<FiltroEstado>('')
  const [page, setPage] = useState(1)
  const [detalleId, setDetalleId] = useState<number | null>(null)
  const [formulario, setFormulario] = useState<EstadoFormulario>(null)
  const [errorFormulario, setErrorFormulario] = useState<ApiErrorResponse | null>(null)

  const nombreDebounced = useDebounce(nombre.trim(), DEBOUNCE_BUSQUEDA)

  // Con otros filtros, la página en la que estaba parado el usuario puede no
  // existir más: siempre se vuelve a la primera.
  useEffect(() => {
    setPage(1)
  }, [nombreDebounced, estado])

  const { data, isFetching, error, refetch } = useMarcas({
    nombre: nombreDebounced || undefined,
    estado: estado === '' ? undefined : estado === 'true',
    page,
    limit: LIMITE_PAGINA,
  })

  const statusCode = error?.statusCode
  const hayFiltrosAplicados = nombreDebounced !== '' || estado !== ''

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

  const crear = useCrearMarca()
  const editar = useEditarMarca()

  function abrirFormulario(estadoInicial: EstadoFormulario) {
    setErrorFormulario(null)
    setFormulario(estadoInicial)
  }

  function cerrarFormulario() {
    setFormulario(null)
    setErrorFormulario(null)
  }

  /**
   * Los errores que el usuario no puede corregir desde el formulario se
   * resuelven acá (avisar y cerrar); los que sí — 400, 409 y los de servidor —
   * bajan al `MarcaForm`, que los pinta sin perder lo cargado.
   */
  function manejarErrorFormulario(error: ApiErrorResponse) {
    switch (error.statusCode) {
      case 401:
        navigate(PATHS.LOGIN, { replace: true })
        return
      case 403:
        toast.error('No tenés permisos para realizar esta acción')
        cerrarFormulario()
        return
      case 404:
        toast.error('La marca ya no existe')
        cerrarFormulario()
        refetch()
        return
      default:
        setErrorFormulario(error)
    }
  }

  function manejarSubmitFormulario(payload: MarcaFormOutput) {
    const descripcion = payload.descripcion?.trim() ?? ''

    if (formulario?.modo === 'crear') {
      crear.mutate(
        // En el alta la descripción vacía se omite: el backend la deja en null.
        { nombre: payload.nombre, ...(descripcion ? { descripcion } : {}) },
        {
          onSuccess: () => {
            toast.success('Marca creada correctamente')
            cerrarFormulario()
            // La marca nueva puede caer en cualquier página del orden alfabético;
            // se vuelve a la primera, con los filtros que estaban puestos.
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
        // borrar la que tenía.
        { id: formulario.marca.id_marca, payload: { nombre: payload.nombre, descripcion } },
        {
          onSuccess: () => {
            toast.success('Marca actualizada correctamente')
            cerrarFormulario()
          },
          onError: manejarErrorFormulario,
        }
      )
    }
  }

  // TODO: conectar la baja (PATCH /marcas/:id/baja) y la reactivación
  // (PATCH /marcas/:id/alta) cuando estén sus HU.
  const avisarPendiente = (accion: string) => toast.info(`${accion}: pendiente de implementación.`)

  const columnas: DataTableColumn<Marca>[] = [
    ...COLUMNAS_MARCAS,
    {
      key: 'acciones',
      label: 'Acciones',
      render: (item) => (
        <RowActions
          isActive={item.estado}
          onView={() => setDetalleId(item.id_marca)}
          onEdit={() => abrirFormulario({ modo: 'editar', marca: item })}
          onDelete={() => avisarPendiente('Dar de baja la marca')}
          onReactivate={() => avisarPendiente('Reactivar la marca')}
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

  const marcas = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FiltrosMarcasBar
          nombre={nombre}
          onNombreChange={setNombre}
          estado={estado}
          onEstadoChange={setEstado}
        />
        <Button icon={<Plus />} onClick={() => abrirFormulario({ modo: 'crear' })}>
          Nueva Marca
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
      ) : (
        <>
          <DataTable
            data={marcas}
            columns={columnas}
            obtenerId={(item) => String(item.id_marca)}
            loading={isFetching}
            skeletonRows={LIMITE_PAGINA}
            ariaLabel="Marcas"
            emptyState={
              <EmptyState
                titulo={
                  hayFiltrosAplicados
                    ? 'No se encontraron marcas con esos criterios'
                    : 'Todavía no hay marcas cargadas'
                }
              />
            }
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

      <MarcaForm
        open={formulario !== null}
        onClose={cerrarFormulario}
        marca={formulario?.modo === 'editar' ? formulario.marca : undefined}
        onSubmit={manejarSubmitFormulario}
        loading={crear.isPending || editar.isPending}
        error={errorFormulario}
      />

      <MarcaDetalleModal idMarca={detalleId} onClose={cerrarDetalle} />
    </div>
  )
}
