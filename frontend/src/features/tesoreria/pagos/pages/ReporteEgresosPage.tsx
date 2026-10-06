import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Eye } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { useProveedores } from '@/features/compras/proveedores/hooks/useProveedores'
import { useFormasPago } from '@/features/tesoreria/formas-pago/hooks/useFormasPago'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { DataTable } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Combobox } from '@/shared/components/ui/Combobox'
import type { ComboboxOption } from '@/shared/components/ui/Combobox'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import { Spinner } from '@/shared/components/ui/Spinner'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { hoyIso } from '@/shared/utils/fecha'
import { finDelDiaIso, inicioDelDiaIso } from '@/shared/utils/fechaIso'
import { PagoDetalleModal } from '../components/PagoDetalleModal'
import { ResumenPeriodoPago } from '../components/ResumenPeriodoPago'
import { COLUMNAS_PAGOS, LIMITE_PAGINA } from '../config/pago.config'
import { usePagos } from '../hooks/usePagos'
import type { Pago } from '../types/pago.types'

/** Resultados que se muestran en el desplegable de búsqueda de proveedor. */
const LIMITE_BUSQUEDA_PROVEEDOR = 10

/** Formas de pago que puede haber usado algún pago histórico, activas o no. */
const LIMITE_FORMAS_PAGO = 100

/** Primer día del mes en curso, en formato `YYYY-MM-DD` (lo que espera un `<input type="date">`). */
function primerDiaDelMesIso(): string {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
}

/**
 * Columnas del listado de pagos, sin la de Estado: en este reporte todas las
 * filas son siempre pagos confirmados (ver `usePagos` más abajo), así que esa
 * columna solo repetiría el mismo valor sin aportar nada.
 */
const COLUMNAS_REPORTE = COLUMNAS_PAGOS.filter((columna) => columna.key !== 'estado')

const FILTROS_INICIALES = {
  FK_proveedor: '',
  FK_forma_pago: '',
  fechaDesde: primerDiaDelMesIso(),
  fechaHasta: hoyIso(),
}

/**
 * Reporte de egresos (T98): reusa `GET /pagos` (el mismo endpoint del listado
 * de Pagos) de forma exclusivamente lectora. A diferencia del listado, acá el
 * período es obligatorio (precargado con el mes en curso) y el estado siempre
 * se fuerza a `CONFIRMADA` — un pago anulado nunca debe aparecer ni sumar al
 * total, sin depender de que alguien elija bien un filtro.
 */
export function ReporteEgresosPage() {
  const navigate = useNavigate()

  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const [page, setPage] = useState(1)
  const [detalleId, setDetalleId] = useState<number | null>(null)

  const { FK_proveedor, FK_forma_pago, fechaDesde, fechaHasta } = filtros

  function cambiarFiltro<K extends keyof typeof FILTROS_INICIALES>(
    campo: K,
    valor: (typeof FILTROS_INICIALES)[K]
  ) {
    setFiltros((actuales) => ({ ...actuales, [campo]: valor }))
  }

  // Con otros filtros, la página en la que estaba parado el usuario puede no
  // existir más: siempre se vuelve a la primera.
  useEffect(() => {
    setPage(1)
  }, [filtros])

  const [busquedaProveedor, setBusquedaProveedor] = useState('')

  const { data: proveedores, isFetching: buscandoProveedores } = useProveedores({
    busqueda: busquedaProveedor.trim() || undefined,
    estado: 'todos',
    limit: LIMITE_BUSQUEDA_PROVEEDOR,
  })

  const { data: formasPago } = useFormasPago({
    estado: 'todos',
    limit: LIMITE_FORMAS_PAGO,
  })

  const opcionesProveedor: ComboboxOption[] = (proveedores?.data ?? []).map((proveedor) => ({
    value: String(proveedor.id_proveedor),
    label: proveedor.razon_social,
    description: [proveedor.cuit, ...(proveedor.estado ? [] : ['Dado de baja'])].join(' · '),
  }))
  const hayMasProveedores = (proveedores?.meta.total ?? 0) > opcionesProveedor.length

  const opcionesFormaPago: SelectOption[] = [
    { value: '', label: 'Todas las formas de pago' },
    ...(formasPago?.data.map((formaPago) => ({
      value: String(formaPago.id_forma_pago),
      label: formaPago.estado ? formaPago.nombre : `${formaPago.nombre} · Inactiva`,
      colorClassName: formaPago.estado ? 'text-success' : 'text-error',
    })) ?? []),
  ]

  // Las dos fechas son ISO `YYYY-MM-DD`, así que alcanza con compararlas como
  // texto para saber cuál es anterior.
  const fechasCompletas = fechaDesde !== '' && fechaHasta !== ''
  const rangoInvalido = fechasCompletas && fechaDesde > fechaHasta
  const puedeConsultar = fechasCompletas && !rangoInvalido

  // El período es obligatorio acá (a diferencia del listado de Pagos): si
  // falta una fecha o el rango es inválido, no se dispara ningún pedido y se
  // avisa el motivo en pantalla, en vez de mostrar una tabla vacía.
  const motivoSinConsulta = !fechasCompletas
    ? 'Elegí las dos fechas del período para generar el reporte.'
    : rangoInvalido
      ? 'La fecha desde no puede ser posterior a la fecha hasta.'
      : null

  const { data, isLoading, isFetching, error, refetch } = usePagos(
    {
      FK_proveedor: FK_proveedor === '' ? undefined : Number(FK_proveedor),
      FK_forma_pago: FK_forma_pago === '' ? undefined : Number(FK_forma_pago),
      estado: 'CONFIRMADA',
      fechaDesde: puedeConsultar ? inicioDelDiaIso(fechaDesde) : undefined,
      fechaHasta: puedeConsultar ? finDelDiaIso(fechaHasta) : undefined,
      page,
      limit: LIMITE_PAGINA,
    },
    { enabled: puedeConsultar }
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

  if (statusCode === 403) {
    return (
      <EmptyState
        titulo="No tenés permisos para acceder a esta sección"
        descripcion="Se requiere el rol Administrador."
      />
    )
  }

  const pagos = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  const columnas: DataTableColumn<Pago>[] = [
    ...COLUMNAS_REPORTE,
    {
      key: 'ver',
      label: 'Detalle',
      render: (item) => (
        <IconButton
          icon={<Eye />}
          ariaLabel="Ver detalle"
          variant="soft"
          size="sm"
          bgColor="fondo-ver"
          iconColor="info"
          onClick={() => setDetalleId(item.id_pago)}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Combobox
          size="sm"
          label="Proveedor"
          placeholder="Todos los proveedores"
          minChars={1}
          value={FK_proveedor}
          onChange={(valor) => cambiarFiltro('FK_proveedor', valor)}
          options={opcionesProveedor}
          onSearch={setBusquedaProveedor}
          loading={buscandoProveedores}
          hasMoreResults={hayMasProveedores}
          emptyText="No se encontraron proveedores"
          className="w-70"
        />

        <Select
          size="sm"
          label="Forma de pago"
          options={opcionesFormaPago}
          value={FK_forma_pago}
          onChange={(evento) => cambiarFiltro('FK_forma_pago', evento.target.value)}
          className="w-60"
        />

        {/* El `<input type="date">` nativo ya trae el calendario del navegador y
          devuelve el valor en ISO (YYYY-MM-DD). */}
        <Input
          size="sm"
          type="date"
          label="Fecha desde"
          value={fechaDesde}
          onChange={(evento) => cambiarFiltro('fechaDesde', evento.target.value)}
          className="w-40"
        />
        <Input
          size="sm"
          type="date"
          label="Fecha hasta"
          value={fechaHasta}
          onChange={(evento) => cambiarFiltro('fechaHasta', evento.target.value)}
          error={
            rangoInvalido ? 'La fecha desde no puede ser posterior a la fecha hasta' : undefined
          }
          className="w-40"
        />
      </div>

      {motivoSinConsulta ? (
        <EmptyState titulo="No se puede generar el reporte" descripcion={motivoSinConsulta} />
      ) : (
        <>
          {data?.resumenPeriodo && <ResumenPeriodoPago resumen={data.resumenPeriodo} />}

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

          {!isLoading && !error && pagos.length === 0 && (
            <EmptyState
              titulo="No se encontraron egresos con esos filtros"
              descripcion="Probá ajustar el proveedor, la forma de pago o el período."
            />
          )}

          {!isLoading && !error && pagos.length > 0 && (
            <>
              <DataTable
                data={pagos}
                columns={columnas}
                obtenerId={(item) => String(item.id_pago)}
                ariaLabel="Reporte de egresos"
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

      <PagoDetalleModal idPago={detalleId} onClose={() => setDetalleId(null)} />
    </div>
  )
}
