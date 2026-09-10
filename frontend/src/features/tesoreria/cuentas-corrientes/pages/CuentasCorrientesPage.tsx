import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ShieldAlert } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { DataTable } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/ui/Spinner'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { FiltrosCuentasCorrientesBar } from '../components/FiltrosCuentasCorrientesBar'
import { ResumenCuentasCorrientes } from '../components/ResumenCuentasCorrientes'
import { COLUMNAS_CUENTAS_CORRIENTES, LIMITE_PAGINA } from '../config/cuentaCorriente.config'
import { useCuentasCorrientes } from '../hooks/useCuentasCorrientes'
import type { CondicionSaldo } from '../types/cuentaCorriente.types'

/**
 * Posición de la empresa frente a cada proveedor: una sola llamada trae la
 * card (resumen, estable frente a `condicionSaldo`) y la tabla (ordenada por
 * saldo descendente siempre — el backend no acepta otro orden).
 */
export function CuentasCorrientesPage() {
  const navigate = useNavigate()

  const [FKProveedor, setFKProveedor] = useState('')
  const [condicionSaldo, setCondicionSaldo] = useState('')
  // Acá, a diferencia del resto del proyecto, sin filtro el backend trae
  // activos e inactivos: un proveedor de baja puede seguir con saldo pendiente.
  const [estado, setEstado] = useState('')
  const [page, setPage] = useState(1)

  const hayFiltros = FKProveedor !== '' || condicionSaldo !== '' || estado !== ''

  function limpiarFiltros() {
    setFKProveedor('')
    setCondicionSaldo('')
    setEstado('')
  }

  // Con otros filtros, la página en la que estaba parado el usuario puede no
  // existir más: siempre se vuelve a la primera.
  useEffect(() => {
    setPage(1)
  }, [FKProveedor, condicionSaldo, estado])

  const { data, isLoading, isFetching, error, refetch } = useCuentasCorrientes({
    FKProveedor: FKProveedor ? Number(FKProveedor) : undefined,
    condicionSaldo: (condicionSaldo || undefined) as CondicionSaldo | undefined,
    estado: estado === '' ? undefined : estado === 'true',
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

  const cuentas = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  return (
    <div className="space-y-4">
      {data && <ResumenCuentasCorrientes resumen={data.resumen} />}

      <FiltrosCuentasCorrientesBar
        FKProveedor={FKProveedor}
        onFKProveedorChange={setFKProveedor}
        condicionSaldo={condicionSaldo}
        onCondicionSaldoChange={setCondicionSaldo}
        estado={estado}
        onEstadoChange={setEstado}
        onLimpiar={limpiarFiltros}
        hayFiltros={hayFiltros}
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

      {!isLoading && !error && cuentas.length === 0 && (
        <EmptyState
          titulo="No se encontraron cuentas corrientes"
          descripcion="Probá ajustar los filtros de búsqueda."
        />
      )}

      {!isLoading && !error && cuentas.length > 0 && (
        <>
          <DataTable
            data={cuentas}
            columns={COLUMNAS_CUENTAS_CORRIENTES}
            obtenerId={(item) => String(item.id_proveedor)}
            ariaLabel="Cuentas corrientes de proveedores"
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
