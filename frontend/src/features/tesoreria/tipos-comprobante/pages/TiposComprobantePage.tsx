import { useEffect, useState } from 'react'
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
import { FiltrosTiposComprobanteBar } from '../components/FiltrosTiposComprobanteBar'
import {
  COLUMNAS_TIPOS_COMPROBANTE,
  DEBOUNCE_BUSQUEDA,
  LIMITE_PAGINA,
} from '../config/tipoComprobante.config'
import { useTiposComprobante } from '../hooks/useTiposComprobante'
import type { FiltroEfectoSaldo, FiltroEstado } from '../types/tipoComprobante.types'

export function TiposComprobantePage() {
  const navigate = useNavigate()

  const [nombre, setNombre] = useState('')
  // El listado abre mostrando solo los activos, que son con los que se trabaja
  // todos los días. Los dados de baja siguen a un cambio de filtro.
  const [estado, setEstado] = useState<FiltroEstado>('true')
  const [efectoSaldo, setEfectoSaldo] = useState<FiltroEfectoSaldo>('')
  const [page, setPage] = useState(1)

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
      <FiltrosTiposComprobanteBar
        nombre={nombre}
        onNombreChange={setNombre}
        estado={estado}
        onEstadoChange={setEstado}
        efectoSaldo={efectoSaldo}
        onEfectoSaldoChange={setEfectoSaldo}
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
            columns={COLUMNAS_TIPOS_COMPROBANTE}
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
    </div>
  )
}
