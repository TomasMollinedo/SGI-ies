import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft, Eye, ShieldAlert } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { ComprobanteDetalleModal } from '@/features/tesoreria/comprobantes/components/ComprobanteDetalleModal'
import { PagoDetalleModal } from '@/features/tesoreria/pagos/components/PagoDetalleModal'
import { finDelDiaIso, inicioDelDiaIso } from '@/features/almacen/movimiento/utils/fechaIso'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { DataTable } from '@/shared/components/common/DataTable'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Button } from '@/shared/components/ui/Button'
import { IconButton } from '@/shared/components/ui/IconButton'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { CardexCuentaCorrienteResumen } from '../components/CardexCuentaCorrienteResumen'
import { FiltrosCardexCuentaCorrienteBar } from '../components/FiltrosCardexCuentaCorrienteBar'
import { COLUMNAS_CARDEX_CUENTA_CORRIENTE } from '../config/cardexCuentaCorriente.config'
import { useCardexCuentaCorriente } from '../hooks/useCuentasCorrientes'
import type {
  ClaseFiltroCardex,
  MovimientoCuentaCorriente,
} from '../types/cardexCuentaCorriente.types'

const FILTROS_VACIOS = { fechaDesde: '', fechaHasta: '', clase: '' }

/**
 * Extracto de cuenta corriente de un proveedor: el historial de comprobantes y
 * pagos que arman su saldo, en orden.
 *
 * Es de solo lectura: no tiene alta, edición ni baja, porque es un cálculo
 * sobre comprobantes ya registrados, no una entidad propia. No pagina —a
 * diferencia del resto de los listados—, porque el backend siempre devuelve el
 * extracto completo del período pedido.
 *
 * Se entra desde una fila del listado de cuentas corrientes, así que el id del
 * proveedor viaja por la URL y la pantalla queda enlazable y compartible.
 */
export function CardexCuentaCorrientePage() {
  const navigate = useNavigate()
  const { idProveedor } = useParams()

  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [detalleComprobanteId, setDetalleComprobanteId] = useState<number | null>(null)
  const [detallePagoId, setDetallePagoId] = useState<number | null>(null)

  const { fechaDesde, fechaHasta, clase } = filtros

  // Un id que no sea un entero positivo no se le pide al backend: la URL la
  // puede editar cualquiera a mano.
  const idNumerico = Number(idProveedor)
  const idValido = Number.isInteger(idNumerico) && idNumerico > 0 ? idNumerico : null

  // Las dos fechas son ISO `YYYY-MM-DD`, así que alcanza con compararlas como
  // texto: no hace falta parsearlas para saber cuál es anterior.
  const rangoInvalido = fechaDesde !== '' && fechaHasta !== '' && fechaDesde > fechaHasta
  const hayFiltros = fechaDesde !== '' || fechaHasta !== '' || clase !== ''

  function cambiarFiltro(campo: keyof typeof FILTROS_VACIOS, valor: string) {
    setFiltros((actuales) => ({ ...actuales, [campo]: valor }))
  }

  const { data, isLoading, error, refetch } = useCardexCuentaCorriente(idValido, {
    // El date picker da `YYYY-MM-DD`, pero `fecha` lleva hora: si se mandara la
    // fecha pelada, el backend la leería como las 00:00 de ese día y el "hasta"
    // dejaría afuera todo lo que pasó durante la jornada.
    //
    // Un rango al revés no se manda: el extracto sigue en pantalla mientras el
    // usuario corrige las fechas, en vez de quedar vacío.
    fechaDesde: rangoInvalido || fechaDesde === '' ? undefined : inicioDelDiaIso(fechaDesde),
    fechaHasta: rangoInvalido || fechaHasta === '' ? undefined : finDelDiaIso(fechaHasta),
    clase: (clase || undefined) as ClaseFiltroCardex | undefined,
  })

  const statusCode = error?.statusCode

  // El interceptor del httpClient ya intenta renovar la sesión; si igual llega
  // un 401 es que no hay sesión recuperable.
  useEffect(() => {
    if (statusCode === 401) navigate(PATHS.LOGIN, { replace: true })
  }, [statusCode, navigate])

  const volverACuentasCorrientes = (
    <Button
      size="sm"
      icon={<ArrowLeft />}
      onClick={() => navigate(PATHS.TESORERIA.CUENTAS_CORRIENTES)}
      title="Volver al listado de cuentas corrientes"
    >
      Volver a Cuentas Corrientes
    </Button>
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

  if (idValido === null || statusCode === 404) {
    return (
      <div className="space-y-4">
        {volverACuentasCorrientes}
        <EmptyState
          titulo="No se encontró el proveedor"
          descripcion="Puede haber sido eliminado, o el enlace estar mal formado."
        />
      </div>
    )
  }

  const movimientos = data?.movimientos ?? []

  const columnas: DataTableColumn<MovimientoCuentaCorriente>[] = [
    ...COLUMNAS_CARDEX_CUENTA_CORRIENTE,
    {
      key: 'acciones',
      label: 'Acciones',
      render: (movimiento) =>
        movimiento.clase === 'APERTURA' ? null : (
          <IconButton
            icon={<Eye />}
            ariaLabel={
              movimiento.clase === 'COMPROBANTE'
                ? 'Ver detalle del comprobante'
                : 'Ver detalle del pago'
            }
            variant="soft"
            size="sm"
            bgColor="fondo-ver"
            iconColor="info"
            onClick={() =>
              movimiento.clase === 'COMPROBANTE'
                ? setDetalleComprobanteId(movimiento.id_referencia)
                : setDetallePagoId(movimiento.id_referencia)
            }
          />
        ),
    },
  ]

  return (
    <div className="space-y-4">
      {volverACuentasCorrientes}

      {error && statusCode !== 401 ? (
        <ErrorState
          mensaje={
            statusCode === 400
              ? 'El período aplicado no es válido.'
              : formatearMensajeError(error.message)
          }
          onReintentar={() => refetch()}
        />
      ) : (
        <>
          {data && (
            <CardexCuentaCorrienteResumen
              proveedor={data.proveedor}
              movimientos={movimientos}
              hayFechaHastaAplicada={!rangoInvalido && fechaHasta !== ''}
            />
          )}

          <FiltrosCardexCuentaCorrienteBar
            fechaDesde={fechaDesde}
            onFechaDesdeChange={(valor) => cambiarFiltro('fechaDesde', valor)}
            fechaHasta={fechaHasta}
            onFechaHastaChange={(valor) => cambiarFiltro('fechaHasta', valor)}
            errorRango={
              rangoInvalido ? 'La fecha desde no puede ser posterior a la fecha hasta' : undefined
            }
            clase={clase}
            onClaseChange={(valor) => cambiarFiltro('clase', valor)}
            onLimpiar={() => setFiltros(FILTROS_VACIOS)}
            hayFiltros={hayFiltros}
          />

          {!isLoading && movimientos.length === 0 && (
            <EmptyState
              titulo={
                hayFiltros
                  ? 'No hay movimientos con los filtros aplicados'
                  : 'Todavía no hay movimientos para este proveedor'
              }
              descripcion={
                hayFiltros
                  ? 'Probá ampliar el período o quitar los filtros.'
                  : 'Los comprobantes y pagos van a aparecer acá a medida que se registren.'
              }
            />
          )}

          {(isLoading || movimientos.length > 0) && (
            <div className="overflow-x-auto">
              <DataTable
                data={movimientos}
                columns={columnas}
                obtenerId={(movimiento) => `${movimiento.clase}-${movimiento.id_referencia}`}
                loading={isLoading}
                ariaLabel="Movimientos de la cuenta corriente"
              />
            </div>
          )}
        </>
      )}

      <ComprobanteDetalleModal
        idComprobante={detalleComprobanteId}
        onClose={() => setDetalleComprobanteId(null)}
        readOnly
      />

      <PagoDetalleModal idPago={detallePagoId} onClose={() => setDetallePagoId(null)} />
    </div>
  )
}
