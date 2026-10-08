import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, ShieldAlert } from 'lucide-react'
import { PATHS, rutaDetalleProyecto, rutaEditarProyecto } from '@/app/router/paths'
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { DataTable } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Button } from '@/shared/components/ui/Button'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { AccionesProyectoRow } from '../components/AccionesProyectoRow'
import { FiltrosProyectosBar } from '../components/FiltrosProyectosBar'
import {
  COLUMNAS_PROYECTOS,
  DEBOUNCE_BUSQUEDA,
  ESTADO_PROYECTO_LABEL,
  LIMITE_PAGINA,
  esEstadoObraFiltrable,
} from '../config/proyecto.config'
import { useDarDeBajaProyecto, useProyectos } from '../hooks/useProyectos'
import type { FiltroEstadoProyecto, ProyectoResumen } from '../types/proyecto.types'

/**
 * Listado de proyectos (HU-31): búsqueda por código o nombre, filtros por
 * estado de obra, localidad y baja lógica, paginación y baja con confirmación.
 * El alta, la edición y el detalle son páginas propias; el avance del estado
 * de obra se hace solo desde el detalle.
 */
export function ProyectosPage() {
  const toast = useToast()
  const navigate = useNavigate()

  const [busqueda, setBusqueda] = useState('')
  const [estadoObra, setEstadoObra] = useState('')
  const [localidad, setLocalidad] = useState('')
  // El listado abre mostrando solo los activos. Los dados de baja se ven
  // cambiando el filtro: la baja es lógica, no se borra nada.
  const [estado, setEstado] = useState<FiltroEstadoProyecto>('true')
  const [page, setPage] = useState(1)
  const [proyectoABajar, setProyectoABajar] = useState<ProyectoResumen | null>(null)
  const [errorBaja, setErrorBaja] = useState<ApiErrorResponse | null>(null)

  const busquedaDebounced = useDebounce(busqueda.trim(), DEBOUNCE_BUSQUEDA)

  // Con otros filtros, la página en la que estaba parado el usuario puede no
  // existir más: siempre se vuelve a la primera.
  useEffect(() => {
    setPage(1)
  }, [busquedaDebounced, estadoObra, localidad, estado])

  const { data, isLoading, isFetching, error, refetch } = useProyectos(
    {
      busqueda: busquedaDebounced || undefined,
      estado_obra: esEstadoObraFiltrable(estadoObra) ? estadoObra : undefined,
      localidad: localidad || undefined,
      // El estado viaja siempre: no se depende del default del backend.
      estado,
      page,
      limit: LIMITE_PAGINA,
    },
    // El % vendido cambia desde otros módulos que no invalidan proyectos.
    { refrescarAlMontar: true }
  )

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
  // (ej. dar de baja con el filtro en "Activos"): se retrocede una página.
  useEffect(() => {
    if (isFetching || !data) return
    if (data.data.length === 0 && data.meta.page > 1) setPage(data.meta.page - 1)
  }, [isFetching, data])

  const baja = useDarDeBajaProyecto()

  function abrirConfirmacionBaja(proyecto: ProyectoResumen) {
    setErrorBaja(null)
    setProyectoABajar(proyecto)
  }

  function cerrarConfirmacionBaja() {
    setProyectoABajar(null)
    setErrorBaja(null)
  }

  function ejecutarBaja() {
    if (!proyectoABajar) return

    setErrorBaja(null)
    baja.mutate(proyectoABajar.id_proyecto, {
      onSuccess: () => {
        toast.success('Proyecto dado de baja correctamente')
        cerrarConfirmacionBaja()
      },
      onError: (errorDeBaja) => {
        switch (errorDeBaja.statusCode) {
          case 401:
            navigate(PATHS.LOGIN, { replace: true })
            return
          case 403:
            toast.error('No tenés permisos para realizar esta acción')
            cerrarConfirmacionBaja()
            return
          case 404:
            toast.error('El proyecto ya no existe')
            cerrarConfirmacionBaja()
            refetch()
            return
          default:
            // 409: la fila que se ve está vieja (ya estaba dado de baja, cambió
            // de estado de obra o le cargaron unidades). Se refresca el listado
            // y el motivo del backend se muestra dentro del diálogo.
            if (errorDeBaja.statusCode === 409) refetch()
            setErrorBaja(errorDeBaja)
        }
      },
    })
  }

  const columnas: DataTableColumn<ProyectoResumen>[] = [
    ...COLUMNAS_PROYECTOS,
    {
      key: 'acciones',
      label: 'Acciones',
      render: (item) => (
        <AccionesProyectoRow
          proyecto={item}
          onVer={() => navigate(rutaDetalleProyecto(item.id_proyecto))}
          onEditar={() => navigate(rutaEditarProyecto(item.id_proyecto))}
          onDarDeBaja={() => abrirConfirmacionBaja(item)}
          dandoDeBaja={baja.isPending && proyectoABajar?.id_proyecto === item.id_proyecto}
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

  const proyectos = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  return (
    <div className="space-y-4">
      <FiltrosProyectosBar
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        estadoObra={estadoObra}
        onEstadoObraChange={setEstadoObra}
        localidad={localidad}
        onLocalidadChange={setLocalidad}
        estado={estado}
        onEstadoChange={setEstado}
        acciones={
          <Button icon={<Plus />} onClick={() => navigate(PATHS.PROYECTOS.NUEVO)}>
            Nuevo proyecto
          </Button>
        }
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

      {!isLoading && !error && proyectos.length === 0 && (
        <EmptyState
          titulo="No se encontraron proyectos"
          descripcion="Probá ajustar los filtros de búsqueda o cargá un proyecto nuevo."
        />
      )}

      {!isLoading && !error && proyectos.length > 0 && (
        <>
          <DataTable
            data={proyectos}
            columns={columnas}
            obtenerId={(item) => String(item.id_proyecto)}
            ariaLabel="Proyectos"
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

      <ConfirmDialog
        open={proyectoABajar !== null}
        onCancel={cerrarConfirmacionBaja}
        onConfirm={ejecutarBaja}
        variant="baja"
        eyebrow="Dar de baja proyecto"
        title={
          proyectoABajar
            ? `¿Confirmás que querés dar de baja el proyecto «${proyectoABajar.nombre}»?`
            : ''
        }
        details={
          proyectoABajar
            ? [
                { label: 'Código', value: proyectoABajar.codigo },
                { label: 'Localidad', value: proyectoABajar.localidad },
                {
                  label: 'Estado de obra',
                  value: ESTADO_PROYECTO_LABEL[proyectoABajar.estado_obra],
                },
              ]
            : undefined
        }
        note={
          errorBaja
            ? undefined
            : 'La baja es lógica: el proyecto deja de listarse entre los activos, pero no se elimina ningún dato y se puede seguir consultando con el filtro "Dados de baja". No se puede reactivar.'
        }
        error={errorBaja ? formatearMensajeError(errorBaja.message) : null}
        // Ningún conflicto se arregla reintentando lo mismo: solo queda cerrar.
        hideConfirm={errorBaja?.statusCode === 409}
        confirmLabel="Dar de baja"
        cancelLabel={errorBaja?.statusCode === 409 ? 'Cerrar' : 'Cancelar'}
        loading={baja.isPending}
      />
    </div>
  )
}
