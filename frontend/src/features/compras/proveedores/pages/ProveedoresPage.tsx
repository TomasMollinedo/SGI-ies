import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { ShieldAlert } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { DataTable } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { FiltrosProveedoresBar } from '../components/FiltrosProveedoresBar'
import {
  DEBOUNCE_BUSQUEDA,
  LIMITE_PAGINA,
  crearColumnasProveedores,
} from '../config/proveedor.config'
import { useCondicionesIva, useProveedores } from '../hooks/useProveedores'
import type { FiltroEstado } from '../types/proveedor.types'

export function ProveedoresPage() {
  const navigate = useNavigate()

  const [busqueda, setBusqueda] = useState('')
  const [condicionIva, setCondicionIva] = useState('')
  // El listado abre mostrando solo los activos, que son con los que se trabaja
  // todos los días. Los dados de baja se ven cambiando el filtro a "Todos".
  const [estado, setEstado] = useState<FiltroEstado>('true')
  const [page, setPage] = useState(1)

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

  // Para la columna de la tabla: traduce el `id` de cada fila al `code` del
  // catálogo. Mientras el catálogo no llegó, o para un `id` que no está en él,
  // se muestra el id tal cual.
  const { data: condicionesIva } = useCondicionesIva()
  const etiquetasCondicionIva = useMemo(
    () => new Map(condicionesIva?.map((item) => [item.id, item.code])),
    [condicionesIva]
  )
  const columnas = useMemo(
    () => crearColumnasProveedores((id) => etiquetasCondicionIva.get(id) ?? id),
    [etiquetasCondicionIva]
  )

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
      <FiltrosProveedoresBar
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        condicionIva={condicionIva}
        onCondicionIvaChange={setCondicionIva}
        estado={estado}
        onEstadoChange={setEstado}
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
    </div>
  )
}
