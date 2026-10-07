import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Eye, ShieldAlert } from 'lucide-react'
import { PATHS, rutaDetalleCliente } from '@/app/router/paths'
import { DataTable } from '@/shared/components/common/DataTable'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { FiltrosClientesBar } from '../components/FiltrosClientesBar'
import { crearColumnasClientes, DEBOUNCE_BUSQUEDA, LIMITE_PAGINA } from '../config/cliente.config'
import { useClientes } from '../hooks/useClientes'
import type { ClienteListItem, FiltroBooleano } from '../types/cliente.types'

const FILTROS_VACIOS = {
  busqueda: '',
  compras: '' as FiltroBooleano,
  mora: '' as FiltroBooleano,
  proyecto: '',
}

/**
 * Listado interno de clientes (HU-33): todos los clientes, cualquiera sea su
 * origen —registrados desde el ecommerce con Google o dados de alta por
 * Comercialización al registrar una venta—, con búsqueda de texto y filtros
 * combinables por compras, mora y proyecto.
 *
 * No tiene alta, edición ni baja: los clientes nacen del login con Google
 * (HU-23) o del alta al registrar una venta presencial (HU-27), y no se dan de
 * baja nunca para conservar su historial. La edición de datos es parte de la
 * ficha, a la que se llega desde cada fila.
 */
export function ClientesPage() {
  const navigate = useNavigate()

  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [page, setPage] = useState(1)

  const { busqueda, compras, mora, proyecto } = filtros
  const busquedaDebounced = useDebounce(busqueda.trim(), DEBOUNCE_BUSQUEDA)
  const hayFiltros = Object.values(filtros).some((valor) => valor !== '')

  function cambiarFiltro<K extends keyof typeof FILTROS_VACIOS>(
    campo: K,
    valor: (typeof FILTROS_VACIOS)[K]
  ) {
    setFiltros((actuales) => ({ ...actuales, [campo]: valor }))
  }

  // Con otros filtros, la página en la que estaba parado el usuario puede no
  // existir más: siempre se vuelve a la primera. Depende de la búsqueda ya
  // debounceada, no de cada tecla.
  useEffect(() => {
    setPage(1)
  }, [busquedaDebounced, compras, mora, proyecto])

  const { data, isLoading, isFetching, error, refetch } = useClientes({
    busqueda: busquedaDebounced || undefined,
    // El tri-estado del `<Select>`: `''` no manda el parámetro y trae todos.
    conCompras: compras === '' ? undefined : compras === 'true',
    enMora: mora === '' ? undefined : mora === 'true',
    FK_proyecto: proyecto === '' ? undefined : Number(proyecto),
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

  const columnas: DataTableColumn<ClienteListItem>[] = [
    ...crearColumnasClientes(),
    {
      key: 'acciones',
      label: 'Acciones',
      render: (item) => (
        <IconButton
          icon={<Eye />}
          ariaLabel={`Ver la ficha de ${item.apellido ? `${item.nombre} ${item.apellido}` : item.nombre}`}
          title="Ver ficha"
          variant="soft"
          size="sm"
          bgColor="fondo-ver"
          iconColor="info"
          onClick={() => navigate(rutaDetalleCliente(item.id_cliente))}
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

  const clientes = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  return (
    <div className="space-y-4">
      <FiltrosClientesBar
        busqueda={busqueda}
        onBusquedaChange={(valor) => cambiarFiltro('busqueda', valor)}
        compras={compras}
        onComprasChange={(valor) => cambiarFiltro('compras', valor)}
        mora={mora}
        onMoraChange={(valor) => cambiarFiltro('mora', valor)}
        proyecto={proyecto}
        onProyectoChange={(valor) => cambiarFiltro('proyecto', valor)}
        onLimpiar={() => setFiltros(FILTROS_VACIOS)}
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

      {!isLoading && !error && clientes.length === 0 && (
        <EmptyState
          titulo={
            hayFiltros
              ? 'No se encontraron clientes con esos filtros'
              : 'Todavía no hay clientes registrados'
          }
          descripcion={
            hayFiltros
              ? 'Probá ajustar los filtros de búsqueda.'
              : 'Los clientes se registran al iniciar sesión con Google en el ecommerce, o cuando Comercialización les registra una venta.'
          }
        />
      )}

      {!isLoading && !error && clientes.length > 0 && (
        <>
          <DataTable
            data={clientes}
            columns={columnas}
            obtenerId={(item) => String(item.id_cliente)}
            ariaLabel="Clientes"
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
