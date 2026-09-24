import { useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Check, Info, TriangleAlert, UserRound } from 'lucide-react'
import { PATHS, rutaDetalleCobro } from '@/app/router/paths'
import type { ClienteResumen } from '@/features/comercializacion/ventas/types/venta.types'
import { useFormasPago } from '@/features/tesoreria/formas-pago/hooks/useFormasPago'
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog'
import { DataTable } from '@/shared/components/common/DataTable'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import { useToast } from '@/shared/hooks/useToast'
import { cn } from '@/shared/utils/cn'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { formatearFechaSinHora, hoyIso } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import { SelectorClienteModal } from '../components/SelectorClienteModal'
import { etiquetaNumeroCuota } from '../config/cobro.config'
import { useCrearCobro, useCuotasImputables } from '../hooks/useCobros'
import { cobroFormSchema } from '../types/cobro.schema'
import type { CobroFormOutput, CobroFormValues } from '../types/cobro.schema'
import type { CrearCobroPayload, CuotaImputable } from '../types/cobro.types'
import { nombreCliente } from '../utils/cliente'
import { formatearCodigoCobro } from '../utils/codigoCobro'
import { aCentavos, tieneFormatoImporte } from '../utils/importeCentavos'
import {
  cuotasSeleccionadas,
  esImporteLineaValido,
  motivoBloqueoCobro,
  sumaImputada,
} from '../utils/motivoBloqueoCobro'
import type { SeleccionCuotas } from '../utils/motivoBloqueoCobro'

function valoresIniciales(): CobroFormValues {
  return {
    FK_cliente: '',
    FK_forma_pago: '',
    fecha_cobro: hoyIso(),
    numero_referencia: '',
    importe_total: '',
    observaciones: '',
  }
}

/**
 * Pantalla de registro de un cobro presencial (HU-30, T114): cabecera
 * (cliente, forma de pago, fecha, referencia, importe total recibido,
 * observaciones) + una tabla de selección sobre las cuotas con saldo del
 * cliente elegido, con el importe a imputar en cada una. Molde:
 * `NuevoPagoPage`. El cobro nace confirmado, así que hay una sola acción.
 *
 * El detalle es un mapa `id cuota → importe` sobre la lista que trae el
 * backend (`GET /cobros/cuotas-imputables`), manejado aparte de React Hook
 * Form. A diferencia de Pagos, el botón nace deshabilitado y el motivo por
 * el que todavía no se puede confirmar se ve siempre, junto al botón (ver
 * `motivoBloqueoCobro`).
 */
export function NuevoCobroPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const crear = useCrearCobro()

  const [confirmarCobro, setConfirmarCobro] = useState(false)
  const [payloadAConfirmar, setPayloadAConfirmar] = useState<CrearCobroPayload | null>(null)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [seleccion, setSeleccion] = useState<SeleccionCuotas>({})
  const [cliente, setCliente] = useState<ClienteResumen | null>(null)
  const [selectorClienteAbierto, setSelectorClienteAbierto] = useState(false)
  // El cliente elegido en el selector mientras se espera la confirmación del
  // cambio: recién se aplica al confirmar, así que cancelar no toca nada.
  const [clientePendiente, setClientePendiente] = useState<ClienteResumen | null>(null)

  const loading = crear.isPending

  // Ref y no `useState`, mismo motivo que en `NuevoPagoPage`: `navigate()` se
  // llama en el mismo tick que lo marca emitido, y el predicado de
  // `useBlocker` tiene que leer el valor nuevo al vuelo.
  const emitidoRef = useRef(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<CobroFormValues, unknown, CobroFormOutput>({
    resolver: zodResolver(cobroFormSchema),
    defaultValues: valoresIniciales(),
    mode: 'onChange',
  })

  const { data: formasPago, isFetching: cargandoFormasPago } = useFormasPago({ limit: 100 })

  const cabecera = watch()
  const idCliente = cabecera.FK_cliente ? Number(cabecera.FK_cliente) : null

  // `isLoading` y no `isFetching`, mismo criterio que en Pagos: al volver a
  // un cliente ya consultado, las cuotas en caché se muestran al toque sin el
  // skeleton de la revalidación en segundo plano.
  const {
    data: cuotasImputables,
    isLoading: cargandoCuotas,
    error: errorCuotas,
    refetch: refetchCuotas,
  } = useCuotasImputables(idCliente)

  const opcionesFormaPago: SelectOption[] = (formasPago?.data ?? []).map((formaPago) => ({
    value: String(formaPago.id_forma_pago),
    label: formaPago.nombre,
  }))
  const formaPago = formasPago?.data.find(
    (fp) => String(fp.id_forma_pago) === cabecera.FK_forma_pago
  )
  const requiereReferencia = Boolean(formaPago?.requiere_referencia)
  const referenciaFaltante = requiereReferencia && !cabecera.numero_referencia?.trim()

  const cuotas = cuotasImputables?.data ?? []
  const seleccionadas = cuotasSeleccionadas(cuotas, seleccion)
  const hayLineasSeleccionadas = seleccionadas.length > 0

  const suma = sumaImputada(cuotas, seleccion)
  const importeTotalValido =
    tieneFormatoImporte(cabecera.importe_total) && aCentavos(Number(cabecera.importe_total)) > 0
  const importeTotal = importeTotalValido ? Number(cabecera.importe_total) : null
  const diferenciaCentavos =
    importeTotal === null ? null : aCentavos(importeTotal) - aCentavos(suma)

  const motivoBloqueo = motivoBloqueoCobro({ ...cabecera, requiereReferencia }, seleccion, cuotas)

  const hayCambiosSinGuardar = isDirty || hayLineasSeleccionadas

  /**
   * Bloquea la navegación interna con cambios sin guardar, igual que
   * `NuevoPagoPage`. La ref de emitido evita bloquear la navegación al
   * detalle después de confirmar.
   */
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hayCambiosSinGuardar &&
      !emitidoRef.current &&
      currentLocation.pathname !== nextLocation.pathname
  )

  useEffect(() => {
    if (!crear.error) return
    setErrorGeneral(formatearMensajeError(crear.error.message))
  }, [crear.error])

  // Cerrar la pestaña o refrescar no pasa por el router: el aviso nativo del
  // navegador es la única forma de interceptar eso.
  useEffect(() => {
    if (!hayCambiosSinGuardar) return

    function avisarAntesDeSalir(evento: BeforeUnloadEvent) {
      if (emitidoRef.current) return
      evento.preventDefault()
    }

    window.addEventListener('beforeunload', avisarAntesDeSalir)
    return () => window.removeEventListener('beforeunload', avisarAntesDeSalir)
  }, [hayCambiosSinGuardar])

  function aplicarCliente(nuevo: ClienteResumen) {
    setValue('FK_cliente', String(nuevo.id_cliente), { shouldValidate: true, shouldDirty: true })
    setCliente(nuevo)
    setSeleccion({})
  }

  /**
   * Si ya había cuotas seleccionadas para el cliente anterior, el cambio no
   * se aplica todavía: el cliente nuevo queda pendiente y se pide
   * confirmación. El selector se cierra antes, para no apilar modales.
   */
  function manejarSeleccionCliente(nuevo: ClienteResumen) {
    setSelectorClienteAbierto(false)
    if (nuevo.id_cliente === cliente?.id_cliente) return

    if (hayLineasSeleccionadas) {
      setClientePendiente(nuevo)
      return
    }
    aplicarCliente(nuevo)
  }

  function confirmarCambioCliente() {
    if (!clientePendiente) return
    aplicarCliente(clientePendiente)
    setClientePendiente(null)
  }

  function alternarSeleccion(cuota: CuotaImputable, seleccionada: boolean) {
    setSeleccion((actual) => {
      const siguiente = { ...actual }
      if (seleccionada) {
        siguiente[cuota.id_cuota] = String(cuota.saldo_pendiente)
      } else {
        delete siguiente[cuota.id_cuota]
      }
      return siguiente
    })
  }

  function cambiarImporte(idCuota: number, valor: string) {
    setSeleccion((actual) => ({ ...actual, [idCuota]: valor }))
  }

  function pedirConfirmacion(datos: CobroFormOutput) {
    // El botón ya está deshabilitado con un motivo; esto es solo defensivo.
    if (motivoBloqueo !== null) return

    setErrorGeneral(null)
    setPayloadAConfirmar({
      FK_cliente: datos.FK_cliente,
      FK_forma_pago: datos.FK_forma_pago,
      fecha_cobro: datos.fecha_cobro,
      numero_referencia: datos.numero_referencia || undefined,
      importe_total: datos.importe_total,
      observaciones: datos.observaciones || undefined,
      detalle: seleccionadas.map((cuota) => ({
        FK_cuota: cuota.id_cuota,
        importe_imputado: Number(seleccion[cuota.id_cuota]),
      })),
    })
    setConfirmarCobro(true)
  }

  function confirmarYRegistrar() {
    if (!payloadAConfirmar) return
    setErrorGeneral(null)
    crear.mutate(payloadAConfirmar, {
      onSuccess: (cobro) => {
        emitidoRef.current = true
        toast.success(`Cobro ${formatearCodigoCobro(cobro.id_cobro)} confirmado.`)
        navigate(rutaDetalleCobro(cobro.id_cobro))
      },
      onError: (errorCreacion) => {
        if (errorCreacion.statusCode === 401) {
          navigate(PATHS.LOGIN, { replace: true })
          return
        }
        if (errorCreacion.statusCode === 403) {
          toast.error('No tenés permisos para realizar esta acción')
          navigate(PATHS.TESORERIA.COBRANZAS.ROOT)
          return
        }
        // El diálogo de confirmación queda abierto mostrando el error (ver `error` más abajo).
      },
    })
  }

  function volver() {
    if (loading) return
    navigate(PATHS.TESORERIA.COBRANZAS.ROOT)
  }

  const columnas: DataTableColumn<CuotaImputable>[] = [
    {
      key: 'seleccion',
      label: '',
      render: (cuota) => (
        <input
          type="checkbox"
          className="accent-primary size-4 cursor-pointer"
          checked={seleccion[cuota.id_cuota] !== undefined}
          onChange={(evento) => alternarSeleccion(cuota, evento.target.checked)}
          disabled={loading}
          aria-label={`Imputar ${etiquetaCuota(cuota.numero)} de ${cuota.venta.unidad.identificador}`}
        />
      ),
    },
    { key: 'venta', label: 'Venta', render: (cuota) => `#${cuota.venta.id_venta}` },
    { key: 'unidad', label: 'Unidad', render: (cuota) => cuota.venta.unidad.identificador },
    {
      key: 'numero',
      label: 'Cuota',
      render: (cuota) => etiquetaNumeroCuota(cuota.numero),
    },
    {
      key: 'vencimiento',
      label: 'Vencimiento',
      render: (cuota) => (
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap">
            {formatearFechaSinHora(cuota.fecha_vencimiento)}
          </span>
          {cuota.vencido && (
            <Badge variant="error" dot={false} className="whitespace-nowrap">
              Vencida · {cuota.dias_vencido} día{cuota.dias_vencido === 1 ? '' : 's'}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'importe',
      label: 'Importe de la cuota',
      render: (cuota) => (
        <span className="whitespace-nowrap">{formatearImporte(cuota.importe)}</span>
      ),
    },
    {
      key: 'saldo',
      label: 'Saldo pendiente',
      render: (cuota) => (
        <span className="whitespace-nowrap">{formatearImporte(cuota.saldo_pendiente)}</span>
      ),
    },
    {
      key: 'imputar',
      label: 'Importe a imputar',
      render: (cuota) => {
        const valor = seleccion[cuota.id_cuota]
        const seleccionada = valor !== undefined
        const invalido = seleccionada && !esImporteLineaValido(valor, cuota.saldo_pendiente)

        return (
          <Input
            type="number"
            inputMode="decimal"
            min={0.01}
            max={cuota.saldo_pendiente}
            step="0.01"
            disabled={!seleccionada || loading}
            value={valor ?? ''}
            onChange={(evento) => cambiarImporte(cuota.id_cuota, evento.target.value)}
            error={invalido ? 'Mayor a 0 y sin superar el saldo pendiente' : undefined}
            aria-label={`Importe a imputar en ${etiquetaCuota(cuota.numero)} de ${cuota.venta.unidad.identificador}`}
            className="w-36"
          />
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <Button
        size="sm"
        icon={<ArrowLeft />}
        onClick={volver}
        disabled={loading}
        title="Volver a Cobranzas"
      >
        Volver a Cobranzas
      </Button>

      <form className="flex flex-col gap-4" onSubmit={(evento) => evento.preventDefault()}>
        {errorGeneral && (
          <div role="alert" className="border-error/30 bg-error/10 rounded-md border px-4 py-3">
            <p className="text-error text-xs">{errorGeneral}</p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-content text-sm font-medium">
            Cliente <span className="text-error">*</span>
          </span>
          {cliente ? (
            <div className="border-subtle flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="text-content text-sm font-medium">{nombreCliente(cliente)}</p>
                <p className="text-content-muted text-xs break-all">
                  {cliente.dni_cuil ?? 'Sin DNI/CUIL'} · {cliente.email}
                </p>
              </div>
              <Button
                size="sm"
                icon={<UserRound />}
                onClick={() => setSelectorClienteAbierto(true)}
                disabled={loading}
              >
                Cambiar cliente
              </Button>
            </div>
          ) : (
            <div>
              <Button
                size="sm"
                icon={<UserRound />}
                onClick={() => setSelectorClienteAbierto(true)}
                disabled={loading}
              >
                Elegir cliente
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Forma de pago"
            required
            placeholder={
              cargandoFormasPago ? 'Cargando formas de pago…' : 'Seleccionar forma de pago'
            }
            disabled={loading || cargandoFormasPago}
            options={opcionesFormaPago}
            error={errors.FK_forma_pago?.message}
            {...register('FK_forma_pago')}
          />

          <Input
            label="Fecha de cobro"
            required
            type="date"
            max={hoyIso()}
            disabled={loading}
            error={errors.fecha_cobro?.message}
            {...register('fecha_cobro')}
          />

          <Input
            label="Número de referencia"
            required={requiereReferencia}
            placeholder="Nro. de operación, transferencia, cheque, etc."
            disabled={loading}
            error={
              errors.numero_referencia?.message ??
              (referenciaFaltante
                ? 'Esta forma de pago requiere un número de referencia'
                : undefined)
            }
            helperText={
              formaPago && !formaPago.requiere_referencia
                ? 'Opcional para esta forma de pago'
                : undefined
            }
            {...register('numero_referencia')}
          />

          <Input
            label="Importe total recibido"
            required
            type="number"
            inputMode="decimal"
            min={0.01}
            step="0.01"
            placeholder="0.00"
            disabled={loading}
            error={errors.importe_total?.message}
            helperText="Lo que entregó el cliente. Tiene que coincidir con la suma de lo imputado."
            {...register('importe_total')}
          />
        </div>

        <Input
          label="Observaciones"
          multiline
          placeholder="Texto breve para identificar el cobro"
          disabled={loading}
          error={errors.observaciones?.message}
          {...register('observaciones')}
        />

        <div className="flex flex-col gap-2">
          <span className="text-content text-sm font-medium">Cuotas a imputar</span>

          {idCliente === null && (
            <p className="text-content-muted text-xs">
              Elegí un cliente para ver sus cuotas con saldo pendiente.
            </p>
          )}

          {/* Sin esto, un error de la consulta se leería como "no tiene cuotas". */}
          {idCliente !== null && errorCuotas && (
            <ErrorState
              mensaje={formatearMensajeError(errorCuotas.message)}
              onReintentar={() => refetchCuotas()}
            />
          )}

          {idCliente !== null && !errorCuotas && !cargandoCuotas && cuotas.length === 0 && (
            <p className="text-content-muted text-xs">
              Este cliente no tiene cuotas con saldo pendiente.
            </p>
          )}

          {idCliente !== null && !errorCuotas && (cargandoCuotas || cuotas.length > 0) && (
            <div className="overflow-x-auto">
              <DataTable
                data={cuotas}
                columns={columnas}
                obtenerId={(cuota) => String(cuota.id_cuota)}
                loading={cargandoCuotas}
                ariaLabel="Cuotas imputables"
              />
            </div>
          )}

          {idCliente !== null && cuotas.length > 0 && (
            <dl className="border-subtle flex flex-col gap-1 border-t pt-3 text-sm sm:items-end">
              <FilaTotal etiqueta="Suma de lo imputado" valor={formatearImporte(suma)} />
              <FilaTotal
                etiqueta="Importe total recibido"
                valor={importeTotal === null ? '—' : formatearImporte(importeTotal)}
              />
              <FilaTotal
                etiqueta="Diferencia"
                destacado
                valor={
                  diferenciaCentavos === null ? '—' : formatearImporte(diferenciaCentavos / 100)
                }
                className={
                  diferenciaCentavos === null
                    ? undefined
                    : diferenciaCentavos === 0
                      ? 'text-success'
                      : 'text-error'
                }
              />
            </dl>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {motivoBloqueo && (
            <p
              role="status"
              aria-live="polite"
              className="text-content-muted flex items-start gap-1.5 text-xs sm:text-right"
            >
              <Info className="text-warning mt-px size-3.5 shrink-0" aria-hidden="true" />
              <span>{motivoBloqueo}</span>
            </p>
          )}
          <Button
            variant="success"
            icon={<Check />}
            onClick={() => void handleSubmit(pedirConfirmacion)()}
            loading={loading}
            disabled={loading || motivoBloqueo !== null}
            className="shrink-0 self-end"
          >
            Confirmar cobro
          </Button>
        </div>
      </form>

      <SelectorClienteModal
        open={selectorClienteAbierto}
        onClose={() => setSelectorClienteAbierto(false)}
        onSeleccionar={manejarSeleccionCliente}
      />

      <ConfirmDialog
        open={confirmarCobro}
        onCancel={() => setConfirmarCobro(false)}
        onConfirm={confirmarYRegistrar}
        variant="reactivar"
        eyebrow="Confirmar cobro"
        eyebrowIcon={<Check />}
        title="¿Confirmar este cobro?"
        details={
          payloadAConfirmar && cliente
            ? [
                { label: 'Cliente', value: nombreCliente(cliente) },
                { label: 'Cuotas imputadas', value: String(payloadAConfirmar.detalle.length) },
                {
                  label: 'Importe total',
                  value: formatearImporte(payloadAConfirmar.importe_total),
                },
              ]
            : []
        }
        note="Una vez confirmado, descuenta el saldo pendiente de cada cuota imputada. Solo puede deshacerse anulándolo."
        confirmLabel="Confirmar cobro"
        confirmIcon={<Check />}
        loading={loading}
        error={confirmarCobro && crear.error ? formatearMensajeError(crear.error.message) : null}
      />

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onCancel={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
        eyebrow="Cambios sin guardar"
        eyebrowIcon={<TriangleAlert />}
        title="¿Salir sin guardar los cambios?"
        note="Lo que cargaste en el formulario se va a perder."
        confirmLabel="Salir"
        cancelLabel="Seguir editando"
      />

      <ConfirmDialog
        open={clientePendiente !== null}
        onCancel={() => setClientePendiente(null)}
        onConfirm={confirmarCambioCliente}
        eyebrow="Cambiar de cliente"
        eyebrowIcon={<TriangleAlert />}
        title="¿Cambiar de cliente?"
        note={`Vas a perder la selección de cuotas que hiciste (${seleccionadas.length} imputada${seleccionadas.length === 1 ? '' : 's'}).`}
        confirmLabel="Cambiar de todas formas"
        cancelLabel="Seguir con este cliente"
      />
    </div>
  )
}

/** Mismo criterio que el cronograma de `VentaDetallePage`: la cuota 0 es el anticipo. */
function etiquetaCuota(numero: number): string {
  return numero === 0 ? 'Anticipo' : `Cuota #${numero}`
}

function FilaTotal({
  etiqueta,
  valor,
  destacado = false,
  className,
}: {
  etiqueta: string
  valor: string
  destacado?: boolean
  className?: string
}) {
  return (
    <div className="flex justify-between gap-8">
      <dt className={destacado ? 'text-content font-medium' : 'text-content-muted'}>{etiqueta}</dt>
      <dd
        className={cn(
          'text-content w-36 text-right font-medium',
          destacado && 'text-base font-semibold',
          className
        )}
      >
        {valor}
      </dd>
    </div>
  )
}
