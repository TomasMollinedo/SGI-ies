import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ShieldAlert } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { DataTable } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import { RowActions } from '@/shared/components/common/RowActions'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { FiltrosTiposMovimientoBar } from '../components/FiltrosTiposMovimientoBar'
import { TipoMovimientoDetalleModal } from '../components/TipoMovimientoDetalleModal'
import {
  COLUMNAS_TIPOS_MOVIMIENTO,
  DEBOUNCE_BUSQUEDA,
  LIMITE_PAGINA,
} from '../config/tipoMovimiento.config'
import { useTiposMovimiento } from '../hooks/useTiposMovimiento'
import type { FiltroEstado, FiltroIndicador, TipoMovimiento } from '../types/tipoMovimiento.types'

export function TiposMovimientoPage() {
  const navigate = useNavigate()

  const [nombre, setNombre] = useState('')
  // El listado abre mostrando solo los activos, que son con los que se trabaja
  // todos los días. Los dados de baja siguen a un cambio de filtro.
  const [estado, setEstado] = useState<FiltroEstado>('true')
  const [indicador, setIndicador] = useState<FiltroIndicador>('')
  const [page, setPage] = useState(1)
  const [detalleId, setDetalleId] = useState<number | null>(null)

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

  /**
   * Editar y baja/reactivar son de otro ticket: las acciones ya quedan
   * cableadas para que ahí alcance con completar estos handlers.
   */
  function manejarEditar() {
    // TODO: abrir el formulario de edición.
  }

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
          // El detalle se pide por id, no por el código que muestra la tabla.
          onView={() => setDetalleId(item.id_tipo_movimiento)}
          onEdit={manejarEditar}
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
      <FiltrosTiposMovimientoBar
        nombre={nombre}
        onNombreChange={setNombre}
        estado={estado}
        onEstadoChange={setEstado}
        indicador={indicador}
        onIndicadorChange={setIndicador}
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

      <TipoMovimientoDetalleModal idTipoMovimiento={detalleId} onClose={cerrarDetalle} />
    </div>
  )
}
