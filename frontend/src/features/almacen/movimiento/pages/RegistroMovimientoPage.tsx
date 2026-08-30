import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, ShieldAlert } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { DataTable } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import { RowActions } from '@/shared/components/common/RowActions'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { FiltrosMovimientosBar } from '../components/FiltrosMovimientosBar'
import { MovimientoDetalleModal } from '../components/MovimientoDetalleModal'
import { MovimientoForm } from '../components/MovimientoForm'
import { COLUMNAS_MOVIMIENTOS, LIMITE_PAGINA } from '../config/movimiento.config'
import { useCrearMovimiento, useMovimientos } from '../hooks/useMovimientos'
import type { MovimientoFormOutput } from '../types/movimiento.schema'
import type { Movimiento } from '../types/movimiento.types'
import { finDelDiaIso, inicioDelDiaIso } from '../utils/fechaIso'

const FILTROS_VACIOS = {
  FK_Deposito: '',
  FK_TipoMovimiento: '',
  FK_articulo: '',
  fechaDesde: '',
  fechaHasta: '',
}

/**
 * Historial de movimientos de stock: el listado con sus filtros, el detalle de
 * cada uno y el alta desde "Nuevo movimiento".
 *
 * Los movimientos no se editan ni se eliminan —son el registro de lo que ya
 * pasó con el stock—, así que la única acción de fila es ver el detalle.
 */
export function RegistroMovimientoPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [page, setPage] = useState(1)
  const [detalleId, setDetalleId] = useState<number | null>(null)
  const [formularioAbierto, setFormularioAbierto] = useState(false)

  const { FK_Deposito, FK_TipoMovimiento, FK_articulo, fechaDesde, fechaHasta } = filtros

  // Las dos fechas son ISO `YYYY-MM-DD`, así que alcanza con compararlas como
  // texto: no hace falta parsearlas para saber cuál es anterior.
  const rangoInvalido = fechaDesde !== '' && fechaHasta !== '' && fechaDesde > fechaHasta
  const hayFiltros = Object.values(filtros).some((valor) => valor !== '')

  function cambiarFiltro(campo: keyof typeof FILTROS_VACIOS, valor: string) {
    setFiltros((actuales) => ({ ...actuales, [campo]: valor }))
  }

  // Con otros filtros, la página en la que estaba parado el usuario puede no
  // existir más: siempre se vuelve a la primera.
  useEffect(() => {
    setPage(1)
  }, [filtros])

  const { data, isLoading, isFetching, error, refetch } = useMovimientos({
    FK_Deposito: FK_Deposito === '' ? undefined : Number(FK_Deposito),
    FK_TipoMovimiento: FK_TipoMovimiento === '' ? undefined : Number(FK_TipoMovimiento),
    FK_articulo: FK_articulo === '' ? undefined : Number(FK_articulo),
    // El date picker da `YYYY-MM-DD`, pero `fecha_movimiento` lleva hora: si se
    // mandara la fecha pelada, el backend la leería como las 00:00 UTC de ese
    // día y el "hasta" dejaría afuera todo lo que pasó durante la jornada. Por
    // eso cada extremo viaja como el instante local que le corresponde.
    //
    // Un rango al revés no se manda: el listado sigue mostrando el resto de los
    // filtros mientras el usuario corrige las fechas, en vez de quedar vacío.
    fechaDesde: rangoInvalido || fechaDesde === '' ? undefined : inicioDelDiaIso(fechaDesde),
    fechaHasta: rangoInvalido || fechaHasta === '' ? undefined : finDelDiaIso(fechaHasta),
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

  const crear = useCrearMovimiento()

  function manejarSubmit(payload: MovimientoFormOutput) {
    crear.mutate(
      {
        // Ya viene en ISO con offset desde el schema del formulario.
        fecha_movimiento: payload.fecha_movimiento,
        FK_TipoMovimiento: payload.FK_TipoMovimiento,
        FK_Deposito: payload.FK_Deposito,
        referencia: payload.referencia || undefined,
        observaciones: payload.observaciones || undefined,
        detalle: payload.detalle.map((linea) => ({
          FK_Stock: linea.FK_Stock,
          cantidad: linea.cantidad,
          observacion: linea.observacion || undefined,
        })),
      },
      {
        onSuccess: (movimiento) => {
          toast.success(`Movimiento N.º ${movimiento.id_movimiento} registrado correctamente.`)
          setFormularioAbierto(false)
          // El listado viene con los más recientes primero: el movimiento nuevo
          // queda arriba de todo, en la primera página.
          setPage(1)
        },
        onError: (error) => toast.error(formatearMensajeError(error.message)),
      }
    )
  }

  const columnas: DataTableColumn<Movimiento>[] = [
    ...COLUMNAS_MOVIMIENTOS,
    {
      key: 'acciones',
      label: 'Acciones',
      // Sin `onEdit` ni `onDelete`, `RowActions` dibuja solo el ojo: un
      // movimiento registrado no se modifica ni se da de baja.
      render: (item) => (
        <RowActions isActive onView={() => setDetalleId(item.id_movimiento)} />
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

  const movimientos = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  return (
    <div className="space-y-4">
      <FiltrosMovimientosBar
        FK_Deposito={FK_Deposito}
        onFKDepositoChange={(valor) => cambiarFiltro('FK_Deposito', valor)}
        FK_TipoMovimiento={FK_TipoMovimiento}
        onFKTipoMovimientoChange={(valor) => cambiarFiltro('FK_TipoMovimiento', valor)}
        FK_articulo={FK_articulo}
        onFKArticuloChange={(valor) => cambiarFiltro('FK_articulo', valor)}
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
          <Button icon={<Plus />} onClick={() => setFormularioAbierto(true)}>
            Nuevo movimiento
          </Button>
        }
      />

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
          {/* Sin resultados no se dibuja la tabla —ni sus encabezados ni el
              fondo blanco—, igual que en Marcas: queda solo el mensaje. */}
          {!isLoading && movimientos.length === 0 && (
            <EmptyState
              titulo={
                hayFiltros
                  ? 'No se encontraron movimientos con esos filtros'
                  : 'Todavía no hay movimientos registrados'
              }
              descripcion={
                hayFiltros
                  ? 'Probá ampliar el rango de fechas o quitar algún filtro.'
                  : 'Registrá el primero con «Nuevo movimiento».'
              }
            />
          )}

          {(isLoading || movimientos.length > 0) && (
            <>
              {/* El skeleton va adentro de la tabla y no como spinner de
                  pantalla completa: así los filtros de arriba nunca saltan. */}
              <DataTable
                data={movimientos}
                columns={columnas}
                obtenerId={(item) => String(item.id_movimiento)}
                loading={isLoading}
                ariaLabel="Movimientos"
              />

              {/* Sin `className`: el pie queda como en Categorías, con el
                  contador de resultados a la izquierda y los controles a la
                  derecha. */}
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

      <MovimientoForm
        open={formularioAbierto}
        onClose={() => setFormularioAbierto(false)}
        onSubmit={manejarSubmit}
        loading={crear.isPending}
      />

      <MovimientoDetalleModal idMovimiento={detalleId} onClose={() => setDetalleId(null)} />
    </div>
  )
}
