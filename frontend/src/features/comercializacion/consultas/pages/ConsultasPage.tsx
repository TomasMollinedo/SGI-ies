import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { MessageSquare, ShieldAlert } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { DataTable } from '@/shared/components/common/DataTable'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Button } from '@/shared/components/ui/Button'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { formatearFecha } from '@/shared/utils/fecha'
import { DetalleConsultaModal } from '../components/DetalleConsultaModal'
import { FiltrosConsultasBar } from '../components/FiltrosConsultasBar'
import { DEBOUNCE_BUSQUEDA, LIMITE_PAGINA, badgeEstadoConsulta } from '../config/consulta.config'
import { useConsultas } from '../hooks/useConsultas'
import type { ConsultaInterna, FiltroEstadoConsulta } from '../types/consulta.types'

/**
 * Cola de trabajo de Comercialización para responder consultas de clientes
 * (HU-26): filtros combinables por proyecto, identificador de unidad,
 * cliente, estado y período, paginada. No es un dashboard: sin indicadores
 * ni gráficos, solo el listado — mismo criterio que `PublicacionesPage`.
 *
 * Incluye las consultas de unidades ya despublicadas: `ConsultaService.listar`
 * no filtra por vigencia de la publicación (no se borran nunca).
 */
export function ConsultasPage() {
  const navigate = useNavigate()

  const [proyecto, setProyecto] = useState('')
  const [identificador, setIdentificador] = useState('')
  const [cliente, setCliente] = useState('')
  const [estado, setEstado] = useState<FiltroEstadoConsulta>('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [page, setPage] = useState(1)
  const [consultaAbierta, setConsultaAbierta] = useState<ConsultaInterna | null>(null)

  const identificadorDebounced = useDebounce(identificador.trim(), DEBOUNCE_BUSQUEDA)

  const hayFiltros =
    proyecto !== '' ||
    identificador !== '' ||
    cliente !== '' ||
    estado !== '' ||
    fechaDesde !== '' ||
    fechaHasta !== ''

  const errorRango =
    fechaDesde && fechaHasta && fechaDesde > fechaHasta
      ? 'No puede ser anterior a la fecha desde'
      : undefined

  // Con otro filtro, la página en la que estaba el usuario puede no existir más.
  useEffect(() => {
    setPage(1)
  }, [proyecto, identificadorDebounced, cliente, estado, fechaDesde, fechaHasta])

  const { data, isLoading, isFetching, error, refetch } = useConsultas({
    FK_proyecto: proyecto ? Number(proyecto) : undefined,
    identificador: identificadorDebounced || undefined,
    FK_cliente: cliente ? Number(cliente) : undefined,
    estado: estado || undefined,
    fechaDesde: !errorRango && fechaDesde ? fechaDesde : undefined,
    fechaHasta: !errorRango && fechaHasta ? fechaHasta : undefined,
    page,
    limit: LIMITE_PAGINA,
  })

  const statusCode = error?.statusCode

  useEffect(() => {
    if (statusCode === 401) navigate(PATHS.LOGIN, { replace: true })
  }, [statusCode, navigate])

  function limpiarFiltros() {
    setProyecto('')
    setIdentificador('')
    setCliente('')
    setEstado('')
    setFechaDesde('')
    setFechaHasta('')
  }

  const columnas: DataTableColumn<ConsultaInterna>[] = [
    {
      key: 'unidad',
      label: 'Unidad',
      render: (item) => (
        <div className="flex flex-col">
          <span className="text-content font-medium">{item.unidad.identificador}</span>
          <span className="text-content-muted text-xs">{item.unidad.proyecto.nombre}</span>
        </div>
      ),
    },
    {
      key: 'cliente',
      label: 'Cliente',
      render: (item) => (
        <div className="flex flex-col">
          <span className="text-content">
            {item.cliente.nombre} {item.cliente.apellido ?? ''}
          </span>
          <span className="text-content-muted text-xs">{item.cliente.email}</span>
        </div>
      ),
    },
    {
      key: 'consulta',
      label: 'Consulta',
      render: (item) => (
        <p className="text-content max-w-xs truncate" title={item.texto}>
          {item.texto}
        </p>
      ),
    },
    {
      key: 'fecha',
      label: 'Fecha',
      render: (item) => formatearFecha(item.hora_creacion),
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (item) => badgeEstadoConsulta(item.estado),
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (item) => (
        <Button
          size="sm"
          variant="primary"
          icon={<MessageSquare />}
          onClick={() => setConsultaAbierta(item)}
        >
          {item.estado === 'PENDIENTE' ? 'Responder' : 'Ver'}
        </Button>
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

  const consultas = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  return (
    <div className="space-y-4">
      <FiltrosConsultasBar
        proyecto={proyecto}
        onProyectoChange={setProyecto}
        identificador={identificador}
        onIdentificadorChange={setIdentificador}
        cliente={cliente}
        onClienteChange={setCliente}
        estado={estado}
        onEstadoChange={setEstado}
        fechaDesde={fechaDesde}
        onFechaDesdeChange={setFechaDesde}
        fechaHasta={fechaHasta}
        onFechaHastaChange={setFechaHasta}
        errorRango={errorRango}
        onLimpiar={limpiarFiltros}
        hayFiltros={hayFiltros}
      />

      {error && statusCode !== 401 ? (
        <ErrorState mensaje={formatearMensajeError(error.message)} onReintentar={() => refetch()} />
      ) : (
        <>
          {!isLoading && consultas.length === 0 && (
            <EmptyState
              titulo={
                hayFiltros
                  ? 'No se encontraron consultas con esos filtros'
                  : 'No hay consultas todavía'
              }
              descripcion={
                hayFiltros
                  ? 'Probá ajustar el proyecto, el identificador, el cliente, el estado o el período.'
                  : 'Las consultas de los clientes sobre unidades publicadas van a aparecer acá.'
              }
            />
          )}

          {(isLoading || consultas.length > 0) && (
            <>
              <DataTable
                data={consultas}
                columns={columnas}
                obtenerId={(item) => String(item.id_consulta)}
                loading={isLoading}
                ariaLabel="Consultas"
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
        </>
      )}

      <DetalleConsultaModal
        consulta={consultaAbierta}
        onClose={() => setConsultaAbierta(null)}
        onRespondida={() => setConsultaAbierta(null)}
      />
    </div>
  )
}
