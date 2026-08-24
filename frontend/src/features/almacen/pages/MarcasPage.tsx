import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, Search, ShieldAlert } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { DataTable, type DataTableColumn } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import { RowActions } from '@/shared/components/common/RowActions'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select, type SelectOption } from '@/shared/components/ui/Select'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { MarcaDetalleModal } from '../components/MarcaDetalleModal'
import { useMarcas } from '../hooks/useMarcas'
import type { FiltroEstado, Marca } from '../types/marca.types'

const RESULTADOS_POR_PAGINA = 10
const DEBOUNCE_BUSQUEDA = 400

const OPCIONES_ESTADO: SelectOption[] = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Activo' },
  { value: 'false', label: 'Inactivo' },
]

export function MarcasPage() {
  const toast = useToast()
  const navigate = useNavigate()

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState<FiltroEstado>('')
  const [pagina, setPagina] = useState(1)
  const [marcaVista, setMarcaVista] = useState<number | null>(null)

  const nombreBuscado = useDebounce(busqueda.trim(), DEBOUNCE_BUSQUEDA)

  // Con otros filtros, la página en la que estaba parado el usuario puede no
  // existir más: siempre se vuelve a la primera.
  useEffect(() => {
    setPagina(1)
  }, [nombreBuscado, estado])

  const { data, isFetching, error, refetch } = useMarcas({
    nombre: nombreBuscado || undefined,
    estado: estado === '' ? undefined : estado === 'true',
    page: pagina,
    limit: RESULTADOS_POR_PAGINA,
  })

  const statusCode = error?.statusCode
  const hayFiltrosAplicados = nombreBuscado !== '' || estado !== ''

  // El interceptor del httpClient ya intenta renovar la sesión; si igual llega
  // un 401 es que no hay sesión recuperable.
  useEffect(() => {
    if (statusCode === 401) navigate(PATHS.LOGIN, { replace: true })
  }, [statusCode, navigate])

  // Un 400 es de los filtros o de la paginación: se vuelve a la primera página
  // para salir de la combinación inválida.
  useEffect(() => {
    if (statusCode === 400) setPagina(1)
  }, [statusCode])

  const cerrarDetalle = useCallback(() => setMarcaVista(null), [])

  // TODO: conectar con el alta, la edición, la baja (PATCH /marcas/:id/baja) y
  // la reactivación (PATCH /marcas/:id/alta) cuando estén sus HU.
  const avisarPendiente = (accion: string) => toast.info(`${accion}: pendiente de implementación.`)

  const columnas: DataTableColumn<Marca>[] = [
    { key: 'codigo', label: 'Código', render: (marca) => `MAR-${marca.id_marca}` },
    { key: 'nombre', label: 'Nombre de la Marca', render: (marca) => marca.nombre },
    {
      key: 'estado',
      label: 'Estado',
      render: (marca) => (
        <Badge variant={marca.estado ? 'active' : 'inactive'}>
          {marca.estado ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (marca) => (
        <RowActions
          isActive={marca.estado}
          onView={() => setMarcaVista(marca.id_marca)}
          onEdit={() => avisarPendiente('Editar marca')}
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
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          size="sm"
          type="search"
          iconLeft={<Search />}
          placeholder="Buscar por código o nombre"
          aria-label="Buscar marcas"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          className="max-w-xs"
        />

        <Select
          size="sm"
          options={OPCIONES_ESTADO}
          aria-label="Filtrar por estado"
          value={estado}
          onChange={(evento) => setEstado(evento.target.value as FiltroEstado)}
          className="max-w-40"
        />

        <Button
          size="sm"
          icon={<Plus />}
          className="ml-auto"
          onClick={() => avisarPendiente('Nueva marca')}
        >
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
            obtenerId={(marca) => String(marca.id_marca)}
            loading={isFetching}
            skeletonRows={RESULTADOS_POR_PAGINA}
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
              onPageChange={setPagina}
              disabled={isFetching}
              className="justify-center"
            />
          )}
        </>
      )}

      <MarcaDetalleModal idMarca={marcaVista} onClose={cerrarDetalle} />
    </section>
  )
}
