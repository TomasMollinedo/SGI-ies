import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Eye, FilterX, ShieldAlert, ShoppingCart } from 'lucide-react'
import { PATHS, rutaDetalleVenta } from '@/app/router/paths'
import { DataTable } from '@/shared/components/common/DataTable'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Button } from '@/shared/components/ui/Button'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Select } from '@/shared/components/ui/Select'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { formatearFecha } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import { CeldaUnidad } from '@/features/comercializacion/publicaciones/components/CeldaUnidad'
import {
  badgeEstadoVenta,
  ESTADO_VENTA_POR_DEFECTO,
  esFiltroEstadoVenta,
  LIMITE_PAGINA,
  OPCIONES_ESTADO_VENTA,
} from '../config/venta.config'
import type { FiltroEstadoVenta } from '../config/venta.config'
import type { VentaListItem } from '../types/venta.types'
import { useVentas } from '../hooks/useVentas'

/**
 * Listado interno de ventas (HU-27): filtro por estado y paginación. El
 * detalle de cada fila muestra el cronograma completo de cuotas.
 */
export function VentasPage() {
  const navigate = useNavigate()

  const [estado, setEstado] = useState<FiltroEstadoVenta>(ESTADO_VENTA_POR_DEFECTO)
  const [page, setPage] = useState(1)

  const hayFiltros = estado !== ESTADO_VENTA_POR_DEFECTO

  useEffect(() => {
    setPage(1)
  }, [estado])

  const { data, isLoading, isFetching, error, refetch } = useVentas({
    estado: estado === 'todos' ? undefined : estado,
    page,
    limit: LIMITE_PAGINA,
  })

  const statusCode = error?.statusCode

  useEffect(() => {
    if (statusCode === 401) navigate(PATHS.LOGIN, { replace: true })
  }, [statusCode, navigate])

  const columnas: DataTableColumn<VentaListItem>[] = [
    {
      key: 'unidad',
      label: 'Unidad',
      render: (venta) => (
        <CeldaUnidad
          identificador={venta.unidad.identificador}
          proyecto={venta.proyecto.nombre}
          tipologia={venta.unidad.tipologia}
        />
      ),
    },
    {
      key: 'cliente',
      label: 'Cliente',
      render: (venta) => (
        <div className="min-w-0">
          <p className="text-content font-medium wrap-anywhere">
            {venta.cliente.nombre} {venta.cliente.apellido ?? ''}
          </p>
          <p className="text-content-muted text-xs wrap-anywhere">{venta.cliente.email}</p>
        </div>
      ),
    },
    {
      key: 'venta',
      label: 'Venta',
      render: (venta) => (
        <div className="text-xs">
          <p className="text-content font-medium">{formatearImporte(venta.precio_congelado)}</p>
          <p className="text-content-muted">{formatearFecha(venta.fecha_adhesion)}</p>
        </div>
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
      <div className="flex w-full flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-end gap-3">
          <Select
            size="sm"
            label="Estado"
            options={OPCIONES_ESTADO_VENTA}
            value={estado}
            onChange={(evento) => {
              const valor = evento.target.value
              if (esFiltroEstadoVenta(valor)) setEstado(valor)
            }}
            className="w-full sm:w-44"
          />
          <Button
            size="sm"
            icon={<FilterX />}
            onClick={() => setEstado(ESTADO_VENTA_POR_DEFECTO)}
            disabled={!hayFiltros}
            title="Volver a los filtros por defecto"
          >
            Limpiar filtros
          </Button>
        </div>

        <Button
          icon={<ShoppingCart />}
          onClick={() => navigate(PATHS.COMERCIALIZACION.NUEVA_VENTA)}
        >
          Registrar venta
        </Button>
      </div>

      {error && statusCode !== 401 ? (
        <ErrorState mensaje={formatearMensajeError(error.message)} onReintentar={() => refetch()} />
      ) : (
        <>
          {!isLoading && ventas.length === 0 && (
            <EmptyState
              titulo={
                hayFiltros ? 'No se encontraron ventas con ese filtro' : 'No hay ventas registradas'
              }
              descripcion={
                hayFiltros
                  ? 'Probá ajustar el filtro de estado.'
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
    </div>
  )
}
