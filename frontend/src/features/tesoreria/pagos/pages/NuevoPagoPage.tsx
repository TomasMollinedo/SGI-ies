import { useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Check, TrendingDown, TrendingUp, TriangleAlert } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { formatearNumeroComprobante } from '@/features/tesoreria/comprobantes/utils/numeroComprobante'
import { useProveedores } from '@/features/compras/proveedores/hooks/useProveedores'
import { useFormasPago } from '@/features/tesoreria/formas-pago/hooks/useFormasPago'
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog'
import { DataTable } from '@/shared/components/common/DataTable'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Combobox } from '@/shared/components/ui/Combobox'
import type { ComboboxOption } from '@/shared/components/ui/Combobox'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { formatearFechaSinHora, hoyIso } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import { DatosBancariosProveedor } from '../components/DatosBancariosProveedor'
import { useComprobantesImputables, useCrearPago } from '../hooks/usePagos'
import { pagoFormSchema } from '../types/pago.schema'
import type { PagoFormOutput, PagoFormValues } from '../types/pago.schema'
import type { ComprobanteImputable, CrearPagoPayload } from '../types/pago.types'
import { formatearCodigoPago } from '../utils/codigoPago'

/** Importe que el usuario editó para cada comprobante seleccionado, como string (input controlado). Ausente = no seleccionado. */
type Seleccion = Record<number, string>

function valoresIniciales(): PagoFormValues {
  return {
    FK_proveedor: '',
    FK_forma_pago: '',
    fecha_pago: hoyIso(),
    numero_referencia: '',
    observaciones: '',
  }
}

/**
 * Pantalla de emisión de un pago (HU-18, T90): cabecera (proveedor, forma de
 * pago, fecha, referencia, observaciones) + una tabla de selección sobre los
 * comprobantes imputables del proveedor elegido, con el importe a imputar en
 * cada uno. A diferencia del comprobante, el pago no tiene borrador: nace
 * directamente confirmado, así que hay una sola acción.
 *
 * El detalle no es un `useFieldArray` de líneas libres: es una selección
 * sobre una lista fija que trae el backend (`GET /pagos/comprobantes-imputables`),
 * así que se maneja aparte de React Hook Form, como un mapa `id comprobante →
 * importe`.
 */
export function NuevoPagoPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const crear = useCrearPago()

  const [confirmarEmision, setConfirmarEmision] = useState(false)
  const [payloadAConfirmar, setPayloadAConfirmar] = useState<CrearPagoPayload | null>(null)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [busquedaProveedor, setBusquedaProveedor] = useState('')
  const [seleccion, setSeleccion] = useState<Seleccion>({})
  const [intentoEnvio, setIntentoEnvio] = useState(false)
  const [proveedorLabelConfirmado, setProveedorLabelConfirmado] = useState('')
  const [proveedorResetKey, setProveedorResetKey] = useState(0)
  const [cambioProveedorPendiente, setCambioProveedorPendiente] = useState<{
    value: string
    label: string
  } | null>(null)

  const loading = crear.isPending

  // Ref y no `useState`: cuando se confirma el pago, `navigate()` se llama en
  // el mismo tick que lo marca emitido. `useBlocker` recién se resincroniza
  // en un efecto (después del próximo render), así que si esto fuera estado
  // todavía leería el valor viejo y bloquearía esa navegación por error — la
  // ref, en cambio, se lee al vuelo dentro del predicado del blocker.
  const emitidoRef = useRef(false)

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty, isValid },
  } = useForm<PagoFormValues, unknown, PagoFormOutput>({
    resolver: zodResolver(pagoFormSchema),
    defaultValues: valoresIniciales(),
    mode: 'onChange',
  })

  const { data: proveedores, isFetching: cargandoProveedores } = useProveedores({
    busqueda: busquedaProveedor || undefined,
    limit: 20,
  })
  const { data: formasPago, isFetching: cargandoFormasPago } = useFormasPago({ limit: 100 })

  const proveedorSeleccionado = watch('FK_proveedor')
  const formaPagoSeleccionada = watch('FK_forma_pago')
  const proveedorId = proveedorSeleccionado ? Number(proveedorSeleccionado) : null
  const hayProveedor = proveedorId !== null

  // `isLoading` (sin datos todavía) y no `isFetching`: al volver a elegir un
  // proveedor ya consultado antes, los comprobantes quedan en caché y se
  // muestran al toque, pero `isFetching` sigue en `true` mientras React Query
  // revalida en segundo plano — usarlo acá tapaba esa tabla con el skeleton
  // un instante de más, el parpadeo raro al buscar proveedor.
  const { data: comprobantesImputables, isLoading: cargandoComprobantes } =
    useComprobantesImputables(proveedorId)

  const opcionesProveedor: ComboboxOption[] = (proveedores?.data ?? []).map((proveedor) => ({
    value: String(proveedor.id_proveedor),
    label: proveedor.razon_social,
  }))
  const hayMasProveedores = (proveedores?.meta.total ?? 0) > (proveedores?.data.length ?? 0)

  const opcionesFormaPago: SelectOption[] = (formasPago?.data ?? []).map((formaPago) => ({
    value: String(formaPago.id_forma_pago),
    label: formaPago.nombre,
  }))
  const formaPago = formasPago?.data.find(
    (fp) => String(fp.id_forma_pago) === formaPagoSeleccionada
  )
  const referenciaFaltante = Boolean(formaPago?.requiere_referencia) && !watch('numero_referencia')

  const comprobantes = comprobantesImputables?.data ?? []
  const comprobantesSeleccionados = comprobantes.filter(
    (c) => seleccion[c.id_comprobante_proveedor] !== undefined
  )
  const hayLineasSeleccionadas = comprobantesSeleccionados.length > 0
  // Factura → HABER: tiene que haber al menos una para no pagar únicamente con notas de crédito.
  const hayLineaHaber = comprobantesSeleccionados.some((c) => c.efecto_saldo === 'HABER')

  const sumaPorEfecto = (efecto: 'DEBE' | 'HABER') =>
    comprobantesSeleccionados
      .filter((c) => c.efecto_saldo === efecto)
      .reduce((acumulado, c) => acumulado + (Number(seleccion[c.id_comprobante_proveedor]) || 0), 0)
  const sumaDebe = sumaPorEfecto('DEBE')
  const sumaHaber = sumaPorEfecto('HABER')
  // Plata que sale: Σ facturas (HABER) − Σ notas de crédito (DEBE).
  const importeNeto = sumaHaber - sumaDebe

  // Un importe inválido (vacío, <= 0 o mayor al saldo pendiente) en cualquier línea seleccionada.
  const hayImportesInvalidos = comprobantesSeleccionados.some((c) => {
    const importe = Number(seleccion[c.id_comprobante_proveedor])
    return !Number.isFinite(importe) || importe <= 0 || importe > c.saldo_pendiente
  })

  // Un importe neto en 0 es válido: representa una deuda liquidada 100% con
  // notas de crédito, sin salida de dinero real (mismo criterio que valida el
  // backend en `validarImporteNetoValido`).
  const detalleValido =
    hayLineasSeleccionadas && !hayImportesInvalidos && hayLineaHaber && importeNeto >= 0
  const mostrarErrorDetalle = intentoEnvio && !detalleValido

  const hayCambiosSinGuardar = isDirty || hayLineasSeleccionadas

  /**
   * Bloquea la navegación interna (sidebar, breadcrumbs, botón "Volver") con
   * cambios sin guardar, mostrando el mismo `ConfirmDialog` que el resto de
   * la app usa para descartar. `useBlocker` requiere el data router del
   * proyecto (`createBrowserRouter`), que ya está en uso.
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

  /**
   * Si ya había comprobantes seleccionados para el proveedor anterior, el
   * cambio no se aplica todavía: se pide confirmación (ver
   * `confirmarCambioProveedor`/`cancelarCambioProveedor`). El `key` del
   * Combobox fuerza su remount para poder "deshacer" la selección visual si
   * el usuario cancela, ya que el componente maneja su propio texto interno.
   */
  function manejarCambioProveedor(nuevoValor: string) {
    const nuevoLabel = opcionesProveedor.find((o) => o.value === nuevoValor)?.label ?? ''

    if (hayLineasSeleccionadas && nuevoValor !== proveedorSeleccionado) {
      setCambioProveedorPendiente({ value: nuevoValor, label: nuevoLabel })
      return
    }

    setValue('FK_proveedor', nuevoValor, { shouldValidate: true, shouldDirty: true })
    setProveedorLabelConfirmado(nuevoLabel)
    setSeleccion({})
  }

  function confirmarCambioProveedor() {
    if (!cambioProveedorPendiente) return
    setValue('FK_proveedor', cambioProveedorPendiente.value, {
      shouldValidate: true,
      shouldDirty: true,
    })
    setProveedorLabelConfirmado(cambioProveedorPendiente.label)
    setSeleccion({})
    setCambioProveedorPendiente(null)
  }

  function cancelarCambioProveedor() {
    setCambioProveedorPendiente(null)
    setProveedorResetKey((clave) => clave + 1)
  }

  function alternarSeleccion(comprobante: ComprobanteImputable, seleccionado: boolean) {
    setSeleccion((actual) => {
      const siguiente = { ...actual }
      if (seleccionado) {
        siguiente[comprobante.id_comprobante_proveedor] = String(comprobante.saldo_pendiente)
      } else {
        delete siguiente[comprobante.id_comprobante_proveedor]
      }
      return siguiente
    })
  }

  function cambiarImporte(idComprobante: number, valor: string) {
    setSeleccion((actual) => ({ ...actual, [idComprobante]: valor }))
  }

  function pedirConfirmacion(cabecera: PagoFormOutput) {
    setIntentoEnvio(true)
    if (referenciaFaltante || !detalleValido) return

    setErrorGeneral(null)
    setPayloadAConfirmar({
      FK_proveedor: cabecera.FK_proveedor,
      FK_forma_pago: cabecera.FK_forma_pago,
      fecha_pago: cabecera.fecha_pago,
      numero_referencia: cabecera.numero_referencia || undefined,
      observaciones: cabecera.observaciones || undefined,
      detalle: comprobantesSeleccionados.map((c) => ({
        FK_comprobante_proveedor: c.id_comprobante_proveedor,
        importe_imputado: Number(seleccion[c.id_comprobante_proveedor]),
      })),
    })
    setConfirmarEmision(true)
  }

  function confirmarYEmitir() {
    if (!payloadAConfirmar) return
    setErrorGeneral(null)
    crear.mutate(payloadAConfirmar, {
      onSuccess: (pago) => {
        emitidoRef.current = true
        toast.success(`Pago ${formatearCodigoPago(pago.id_pago)} confirmado.`)
        navigate(PATHS.TESORERIA.PAGOS.ROOT)
      },
      onError: (errorCreacion) => {
        if (errorCreacion.statusCode === 401) {
          navigate(PATHS.LOGIN, { replace: true })
          return
        }
        if (errorCreacion.statusCode === 403) {
          toast.error('No tenés permisos para realizar esta acción')
          navigate(PATHS.TESORERIA.PAGOS.ROOT)
          return
        }
        // El diálogo de confirmación queda abierto mostrando el error (ver `error` más abajo).
      },
    })
  }

  function volver() {
    if (loading) return
    navigate(PATHS.TESORERIA.PAGOS.ROOT)
  }

  const columnas: DataTableColumn<ComprobanteImputable>[] = [
    {
      key: 'seleccion',
      label: '',
      render: (item) => (
        <input
          type="checkbox"
          className="accent-primary size-4 cursor-pointer"
          checked={seleccion[item.id_comprobante_proveedor] !== undefined}
          onChange={(evento) => alternarSeleccion(item, evento.target.checked)}
          aria-label={`Imputar ${formatearNumeroComprobante(item)}`}
        />
      ),
    },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (item) => (
        <div className="flex items-center gap-2">
          <span>{item.tipo_comprobante_nombre}</span>
          <Badge variant={item.efecto_saldo === 'HABER' ? 'error' : 'active'} dot={false}>
            {item.efecto_saldo === 'HABER' ? (
              <TrendingUp className="size-3.5" aria-hidden="true" />
            ) : (
              <TrendingDown className="size-3.5" aria-hidden="true" />
            )}
            {item.efecto_saldo === 'HABER' ? 'Haber' : 'Debe'}
          </Badge>
        </div>
      ),
    },
    { key: 'numero', label: 'Comprobante', render: (item) => formatearNumeroComprobante(item) },
    {
      key: 'emision',
      label: 'Emisión',
      render: (item) => (
        <span className="whitespace-nowrap">{formatearFechaSinHora(item.fecha_emision)}</span>
      ),
    },
    {
      key: 'vencimiento',
      label: 'Vencimiento',
      render: (item) => (
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap">{formatearFechaSinHora(item.fecha_vencimiento)}</span>
          {item.vencido && (
            <Badge variant="error" dot={false}>
              Vencido · {item.dias_vencido} día{item.dias_vencido === 1 ? '' : 's'}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'importeTotal',
      label: 'Importe total',
      render: (item) => (
        <span className="whitespace-nowrap">{formatearImporte(item.importe_total)}</span>
      ),
    },
    {
      key: 'saldo',
      label: 'Saldo pendiente',
      render: (item) => (
        <span className="whitespace-nowrap">{formatearImporte(item.saldo_pendiente)}</span>
      ),
    },
    {
      key: 'importe',
      label: 'Importe a imputar',
      render: (item) => {
        const seleccionado = seleccion[item.id_comprobante_proveedor] !== undefined
        const importe = Number(seleccion[item.id_comprobante_proveedor])
        const invalido =
          seleccionado &&
          (!Number.isFinite(importe) || importe <= 0 || importe > item.saldo_pendiente)

        return (
          <Input
            type="number"
            min={0.01}
            max={item.saldo_pendiente}
            step="0.01"
            disabled={!seleccionado}
            value={seleccion[item.id_comprobante_proveedor] ?? ''}
            onChange={(evento) =>
              cambiarImporte(item.id_comprobante_proveedor, evento.target.value)
            }
            error={invalido ? 'Debe ser mayor a 0 y no superar el saldo pendiente' : undefined}
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
        title="Volver al listado de pagos"
      >
        Volver a Pagos
      </Button>

      <form className="flex flex-col gap-4" onSubmit={(evento) => evento.preventDefault()}>
        {errorGeneral && (
          <div role="alert" className="border-error/30 bg-error/10 rounded-md border px-4 py-3">
            <p className="text-error text-xs">{errorGeneral}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="FK_proveedor"
            control={control}
            render={({ field }) => (
              <Combobox
                key={proveedorResetKey}
                label="Proveedor"
                required
                placeholder="Buscar proveedor"
                minChars={0}
                value={field.value}
                onChange={manejarCambioProveedor}
                selectedLabel={proveedorLabelConfirmado}
                options={opcionesProveedor}
                onSearch={setBusquedaProveedor}
                loading={cargandoProveedores}
                hasMoreResults={hayMasProveedores}
                disabled={loading}
                error={errors.FK_proveedor?.message}
              />
            )}
          />

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
            label="Fecha de pago"
            required
            type="date"
            max={hoyIso()}
            disabled={loading}
            error={errors.fecha_pago?.message}
            {...register('fecha_pago')}
          />

          <Input
            label="Número de referencia"
            required={Boolean(formaPago?.requiere_referencia)}
            placeholder="Nro. de operación, cheque, etc."
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
        </div>

        {hayProveedor && proveedorId !== null && (
          <DatosBancariosProveedor proveedorId={proveedorId} disabled={loading} />
        )}

        <Input
          label="Observaciones"
          multiline
          placeholder="Texto breve para identificar el pago"
          disabled={loading}
          error={errors.observaciones?.message}
          {...register('observaciones')}
        />

        <div className="flex flex-col gap-2">
          <span className="text-content text-sm font-medium">Comprobantes a imputar</span>

          {!hayProveedor && (
            <p className="text-content-muted text-xs">
              Elegí un proveedor para ver sus comprobantes con saldo pendiente.
            </p>
          )}

          {hayProveedor && !cargandoComprobantes && comprobantes.length === 0 && (
            <p className="text-content-muted text-xs">
              Este proveedor no tiene comprobantes registrados con saldo pendiente.
            </p>
          )}

          {hayProveedor && (cargandoComprobantes || comprobantes.length > 0) && (
            <div className="overflow-x-auto">
              <DataTable
                data={comprobantes}
                columns={columnas}
                obtenerId={(item) => String(item.id_comprobante_proveedor)}
                loading={cargandoComprobantes}
                ariaLabel="Comprobantes imputables"
              />
            </div>
          )}

          {mostrarErrorDetalle && (
            <p className="text-error text-xs">
              {!hayLineasSeleccionadas
                ? 'Seleccioná al menos un comprobante para imputar.'
                : hayImportesInvalidos
                  ? 'Revisá los importes marcados: deben ser mayores a 0 y no superar el saldo pendiente.'
                  : !hayLineaHaber
                    ? 'El pago debe imputar al menos un comprobante que aumente el saldo (factura); no se puede pagar únicamente con notas de crédito.'
                    : 'Las notas de crédito imputadas superan la deuda seleccionada.'}
            </p>
          )}

          {hayLineasSeleccionadas && (
            <dl className="border-subtle flex flex-col items-end gap-1 border-t pt-3 text-sm">
              <div className="flex justify-between gap-8">
                <dt className="text-content-muted">Total Debe</dt>
                <dd className="text-content w-32 text-right font-medium">
                  {formatearImporte(sumaDebe)}
                </dd>
              </div>
              <div className="flex justify-between gap-8">
                <dt className="text-content-muted">Total Haber</dt>
                <dd className="text-content w-32 text-right font-medium">
                  {formatearImporte(sumaHaber)}
                </dd>
              </div>
              <div className="flex justify-between gap-8">
                <dt className="text-content font-medium">Importe neto del pago</dt>
                <dd className="text-content w-32 text-right text-lg font-semibold">
                  {formatearImporte(importeNeto)}
                </dd>
              </div>
            </dl>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            variant="success"
            icon={<Check />}
            onClick={() => void handleSubmit(pedirConfirmacion)()}
            loading={loading}
            disabled={loading || !isValid}
          >
            Confirmar pago
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmarEmision}
        onCancel={() => setConfirmarEmision(false)}
        onConfirm={confirmarYEmitir}
        variant="reactivar"
        eyebrow="Confirmar pago"
        eyebrowIcon={<Check />}
        title="¿Confirmar y emitir este pago?"
        details={
          payloadAConfirmar
            ? [
                {
                  label: 'Comprobantes imputados',
                  value: String(payloadAConfirmar.detalle.length),
                },
                { label: 'Importe neto', value: formatearImporte(importeNeto) },
              ]
            : []
        }
        note="Una vez confirmado, descuenta el saldo pendiente de cada comprobante imputado. Solo puede deshacerse anulándolo."
        confirmLabel="Confirmar pago"
        confirmIcon={<Check />}
        loading={loading}
        error={confirmarEmision && crear.error ? formatearMensajeError(crear.error.message) : null}
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
        open={cambioProveedorPendiente !== null}
        onCancel={cancelarCambioProveedor}
        onConfirm={confirmarCambioProveedor}
        eyebrow="Cambiar de proveedor"
        eyebrowIcon={<TriangleAlert />}
        title="¿Cambiar de proveedor?"
        note={`Vas a perder la selección de comprobantes que hiciste (${comprobantesSeleccionados.length} imputado${comprobantesSeleccionados.length === 1 ? '' : 's'}).`}
        confirmLabel="Cambiar de todas formas"
        cancelLabel="Seguir con este proveedor"
      />
    </div>
  )
}
