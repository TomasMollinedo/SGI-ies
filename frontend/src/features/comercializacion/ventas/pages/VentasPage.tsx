import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Eye, ShieldAlert, ShoppingCart } from 'lucide-react'
import { PATHS, rutaDetalleVenta } from '@/app/router/paths'
import { DataTable } from '@/shared/components/common/DataTable'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Button } from '@/shared/components/ui/Button'
import { IconButton } from '@/shared/components/ui/IconButton'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { formatearFecha } from '@/shared/utils/fecha'
import { finDelDiaIso, inicioDelDiaIso } from '@/shared/utils/fechaIso'
import { formatearImporte } from '@/shared/utils/importe'
import { TIPO_PLAN_LABEL } from '@/features/comercializacion/planes-pago/config/planPago.config'
import { FiltrosVentasBar } from '../components/FiltrosVentasBar'
import { RegistrarVentaModal } from '../components/RegistrarVentaModal'
import {
  badgeEstadoVenta,
  ESTADO_VENTA_POR_DEFECTO,
  LIMITE_PAGINA,
  MODALIDAD_VENTA_POR_DEFECTO,
  SIN_DATO,
} from '../config/venta.config'
import type { VentaListItem } from '../types/venta.types'
import { useVentas } from '../hooks/useVentas'

const FILTROS_VACIOS = {
  estado: ESTADO_VENTA_POR_DEFECTO,
  modalidad: MODALIDAD_VENTA_POR_DEFECTO,
  proyecto: '',
  cliente: '',
  fechaDesde: '',
  fechaHasta: '',
}

/**
 * Listado interno de ventas (HU-27): filtrable por proyecto, cliente, estado,
 * modalidad y período, con paginación. El detalle de cada fila muestra el cronograma
 * completo de cuotas. Sin filtro de unidad: se sacó porque, con proyecto ya
 * acotando el listado, no aportaba lo suficiente.
 */
export function VentasPage() {
  const navigate = useNavigate()

  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [page, setPage] = useState(1)
  const [registrarAbierto, setRegistrarAbierto] = useState(false)

  const { estado, modalidad, proyecto, cliente, fechaDesde, fechaHasta } = filtros

  // Las dos fechas son ISO `YYYY-MM-DD`, así que alcanza con compararlas como texto.
  const rangoInvalido = fechaDesde !== '' && fechaHasta !== '' && fechaDesde > fechaHasta
  // Cada filtro contra su propio valor vacío, en vez de una sola constante:
  // con dos filtros en "todos" (estado y modalidad) no alcanza con comparar contra uno solo.
  const hayFiltros = (Object.keys(FILTROS_VACIOS) as (keyof typeof FILTROS_VACIOS)[]).some(
    (campo) => filtros[campo] !== FILTROS_VACIOS[campo]
  )

  function cambiarFiltro<K extends keyof typeof FILTROS_VACIOS>(
    campo: K,
    valor: (typeof FILTROS_VACIOS)[K]
  ) {
    setFiltros((actuales) => ({ ...actuales, [campo]: valor }))
  }

  // Con otros filtros, la página en la que estaba parado el usuario puede no
  // existir más: siempre se vuelve a la primera.
  useEffect(() => {
    setPage(1)
  }, [filtros])

  const { data, isLoading, isFetching, error, refetch } = useVentas({
    estado: estado === 'todos' ? undefined : estado,
    modalidad: modalidad === 'todos' ? undefined : modalidad,
    FK_proyecto: proyecto === '' ? undefined : Number(proyecto),
    FK_cliente: cliente === '' ? undefined : Number(cliente),
    // Un rango al revés no se manda: el listado sigue mostrando el resto de
    // los filtros mientras el usuario corrige las fechas.
    fechaDesde: rangoInvalido || fechaDesde === '' ? undefined : inicioDelDiaIso(fechaDesde),
    fechaHasta: rangoInvalido || fechaHasta === '' ? undefined : finDelDiaIso(fechaHasta),
    page,
    limit: LIMITE_PAGINA,
  })

  const statusCode = error?.statusCode

  useEffect(() => {
    if (statusCode === 401) navigate(PATHS.LOGIN, { replace: true })
  }, [statusCode, navigate])

  const columnas: DataTableColumn<VentaListItem>[] = [
    {
      key: 'fecha',
      label: 'Fecha',
      render: (venta) => (
        <p className="text-content-muted text-xs">{formatearFecha(venta.fecha_venta)}</p>
      ),
    },
    {
      key: 'cliente',
      label: 'Cliente',
      render: (venta) => (
        <p className="text-content font-medium wrap-anywhere">
          {venta.cliente.nombre} {venta.cliente.apellido ?? ''}
        </p>
      ),
    },
    {
      key: 'unidad',
      label: 'Unidad',
      // Con tantas columnas nuevas (precio, modalidad, cuotas, TNA, saldo),
      // la tabla no entra con el proyecto y la tipología debajo del código
      // (eso ya se ve al abrir el detalle): acá solo el código de la unidad.
      render: (venta) => <p className="text-content font-medium">{venta.unidad.identificador}</p>,
    },
    {
      key: 'precio',
      label: 'Precio',
      render: (venta) => (
        <p className="text-content text-xs font-medium">{formatearImporte(venta.plan.precio)}</p>
      ),
    },
    {
      key: 'modalidad',
      label: 'Modalidad',
      render: (venta) => TIPO_PLAN_LABEL[venta.plan.modalidad],
    },
    {
      key: 'cuotas',
      label: 'Cuotas',
      headerTooltip: 'Una venta al contado no tiene cuotas ni tasa',
      render: (venta) => venta.plan.cantidad_cuotas ?? SIN_DATO,
    },
    {
      key: 'tna',
      label: 'TNA',
      render: (venta) =>
        venta.plan.tasa_nominal_anual === null ? SIN_DATO : `${venta.plan.tasa_nominal_anual} %`,
    },
    {
      key: 'saldoPendiente',
      label: 'Saldo pendiente',
      render: (venta) => (
        <p className="text-content text-xs font-medium">
          {formatearImporte(venta.saldo_pendiente)}
        </p>
      ),
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (venta) => badgeEstadoVenta(venta.estado),
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (venta) => (
        <IconButton
          icon={<Eye />}
          ariaLabel={`Ver detalle de la venta de ${venta.cliente.nombre}`}
          title="Ver detalle"
          variant="soft"
          size="sm"
          bgColor="fondo-ver"
          iconColor="info"
          onClick={() => navigate(rutaDetalleVenta(venta.id_venta))}
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

  const ventas = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  return (
    <div className="space-y-4">
      <FiltrosVentasBar
        estado={estado}
        onEstadoChange={(valor) => cambiarFiltro('estado', valor)}
        modalidad={modalidad}
        onModalidadChange={(valor) => cambiarFiltro('modalidad', valor)}
        proyecto={proyecto}
        onProyectoChange={(valor) => cambiarFiltro('proyecto', valor)}
        cliente={cliente}
        onClienteChange={(valor) => cambiarFiltro('cliente', valor)}
        fechaDesde={fechaDesde}
        onFechaDesdeChange={(valor) => cambiarFiltro('fechaDesde', valor)}
        fechaHasta={fechaHasta}
        onFechaHastaChange={(valor) => cambiarFiltro('fechaHasta', valor)}
        errorRango={
          rangoInvalido ? 'La fecha desde no puede ser posterior a la fecha hasta' : undefined
        }
        onLimpiar={() => setFiltros(FILTROS_VACIOS)}
        hayFiltros={hayFiltros}
        acciones={
          <Button icon={<ShoppingCart />} onClick={() => setRegistrarAbierto(true)}>
            Registrar venta
          </Button>
        }
      />

      {error && statusCode !== 401 ? (
        <ErrorState mensaje={formatearMensajeError(error.message)} onReintentar={() => refetch()} />
      ) : (
        <>
          {!isLoading && ventas.length === 0 && (
            <EmptyState
              titulo={
                hayFiltros
                  ? 'No se encontraron ventas con esos filtros'
                  : 'No hay ventas registradas'
              }
              descripcion={
                hayFiltros
                  ? 'Probá ajustar los filtros de búsqueda.'
                  : 'Registrá la primera con «Registrar venta».'
              }
            />
          )}

          {(isLoading || ventas.length > 0) && (
            <>
              <DataTable
                data={ventas}
                columns={columnas}
                obtenerId={(venta) => String(venta.id_venta)}
                loading={isLoading}
                ariaLabel="Ventas"
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

      <RegistrarVentaModal
        open={registrarAbierto}
        onClose={() => setRegistrarAbierto(false)}
        // Vuelve al listado (no al detalle): ya se refresca solo, porque
        // `useCrearVenta` invalida la lista al confirmar.
        onVentaRegistrada={() => setRegistrarAbierto(false)}
      />
    </div>
  )
}
