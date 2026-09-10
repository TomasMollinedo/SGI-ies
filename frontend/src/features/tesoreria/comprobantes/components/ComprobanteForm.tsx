import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import type { UseFormSetError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Plus, Receipt, TrendingDown, TrendingUp, TriangleAlert, X } from 'lucide-react'
import { useProveedores } from '@/features/compras/proveedores/hooks/useProveedores'
import { useTiposComprobante } from '@/features/tesoreria/tipos-comprobante/hooks/useTiposComprobante'
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog'
import { Modal } from '@/shared/components/common/Modal'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Combobox } from '@/shared/components/ui/Combobox'
import type { ComboboxOption } from '@/shared/components/ui/Combobox'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { esArrayDeValidationIssues, formatearMensajeError } from '@/shared/utils/apiError'
import { DetalleLineaComprobanteRow } from './DetalleLineaComprobanteRow'
import { useComprobantes } from '../hooks/useComprobantes'
import { useOrdenesCompra } from '../hooks/useOrdenesCompra'
import { comprobanteFormSchema } from '../types/comprobante.schema'
import type {
  ComprobanteFormOutput,
  ComprobanteFormValues,
  LineaComprobanteFormValues,
} from '../types/comprobante.schema'
import { formatearFechaSinHora, hoyIso } from '../utils/fechaComprobante'
import { formatearMoneda } from '../utils/formatearMoneda'
import { formatearNumeroComprobante } from '../utils/numeroComprobante'

const ID_FORM = 'form-comprobante'

/** Alícuota de IVA por defecto: la general en Argentina. */
const ALICUOTA_IVA_DEFECTO = 21

/** Cuántas órdenes de compra / comprobantes de origen ofrece el selector (los más recientes). */
const LIMITE_VINCULABLES = 50

const LINEA_VACIA: LineaComprobanteFormValues = {
  descripcion: '',
  FK_articulo: '',
  cantidad: 1,
  precio_unitario: 0,
}

function valoresIniciales(): ComprobanteFormValues {
  return {
    FK_tipo_comprobante: '',
    FK_proveedor: '',
    FK_orden_compra: '',
    FK_comprobante_origen: '',
    letra: '',
    punto_de_venta: 0,
    numero: 0,
    fecha_emision: hoyIso(),
    fecha_vencimiento: '',
    observaciones: '',
    alicuota_iva: ALICUOTA_IVA_DEFECTO,
    detalle: [LINEA_VACIA],
  }
}

/** Redondeo a 2 decimales, igual que `redondear` del backend (`Math.round(x*100)/100`). */
function redondear(valor: number): number {
  return Math.round(valor * 100) / 100
}

function subtotalLinea(linea: { cantidad: number; precio_unitario: number }): number {
  if (!Number.isFinite(linea.cantidad) || !Number.isFinite(linea.precio_unitario)) return 0
  return redondear(linea.cantidad * linea.precio_unitario)
}

interface ComprobanteFormProps {
  open: boolean
  onClose: () => void
  onGuardarBorrador: (payload: ComprobanteFormOutput) => void
  onConfirmar: (payload: ComprobanteFormOutput) => void
  loadingBorrador?: boolean
  loadingConfirmar?: boolean
  /** Error del último intento (guardar borrador o confirmar) que la página no resolvió sola. */
  error?: ApiErrorResponse | null
}

/**
 * Modal de alta de un comprobante de proveedor: cabecera + grilla de detalle,
 * con el subtotal de cada línea y los cuatro importes recalculados en vivo con
 * la misma fórmula y redondeo que el backend.
 *
 * Dos acciones, igual que el ciclo de vida del backend:
 * - "Guardar borrador": crea el comprobante en BORRADOR (puede no tener líneas).
 * - "Confirmar y registrar": pide al menos una línea y muestra un `ConfirmDialog`
 *   con el resumen — al registrarse, la cabecera y el detalle dejan de editarse.
 */
export function ComprobanteForm({
  open,
  onClose,
  onGuardarBorrador,
  onConfirmar,
  loadingBorrador = false,
  loadingConfirmar = false,
  error = null,
}: ComprobanteFormProps) {
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)
  const [confirmarRegistro, setConfirmarRegistro] = useState(false)
  const [payloadAConfirmar, setPayloadAConfirmar] = useState<ComprobanteFormOutput | null>(null)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [busquedaProveedor, setBusquedaProveedor] = useState('')

  const cargando = loadingBorrador || loadingConfirmar

  const { data: tipos, isFetching: cargandoTipos } = useTiposComprobante({
    estado: true,
    limit: 100,
  })
  const { data: proveedores, isFetching: cargandoProveedores } = useProveedores({
    busqueda: busquedaProveedor || undefined,
    limit: 20,
  })

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isDirty, isValid },
  } = useForm<ComprobanteFormValues, unknown, ComprobanteFormOutput>({
    resolver: zodResolver(comprobanteFormSchema),
    defaultValues: valoresIniciales(),
    mode: 'onChange',
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'detalle' })
  const detalle = watch('detalle')

  const proveedorSeleccionado = watch('FK_proveedor')
  const tipoSeleccionado = watch('FK_tipo_comprobante')
  const alicuotaSeleccionada = watch('alicuota_iva')
  const proveedorId = proveedorSeleccionado ? Number(proveedorSeleccionado) : undefined
  const hayProveedor = proveedorId !== undefined

  const tipoElegido = (tipos?.data ?? []).find(
    (tipo) => String(tipo.id_tipo_comprobante) === tipoSeleccionado
  )
  const nombresPorTipo = useMemo(
    () => new Map((tipos?.data ?? []).map((tipo) => [tipo.id_tipo_comprobante, tipo.nombre])),
    [tipos]
  )

  const { data: ordenesCompra, isFetching: cargandoOrdenesCompra } = useOrdenesCompra(
    { FK_proveedor: proveedorId, limit: LIMITE_VINCULABLES },
    { enabled: hayProveedor }
  )
  const { data: comprobantesOrigen, isFetching: cargandoOrigen } = useComprobantes(
    { FK_proveedor: proveedorId, estado: 'REGISTRADO', limit: LIMITE_VINCULABLES },
    { enabled: hayProveedor }
  )

  const opcionesTipo: SelectOption[] = (tipos?.data ?? []).map((tipo) => ({
    value: String(tipo.id_tipo_comprobante),
    label: tipo.nombre,
  }))

  const opcionesProveedor: ComboboxOption[] = (proveedores?.data ?? []).map((proveedor) => ({
    value: String(proveedor.id_proveedor),
    label: proveedor.razon_social,
  }))
  const hayMasProveedores = (proveedores?.meta.total ?? 0) > (proveedores?.data.length ?? 0)

  const opcionesOrdenCompra: SelectOption[] = [
    { value: '', label: '— Sin vincular —' },
    ...(ordenesCompra?.data ?? []).map((orden) => ({
      value: String(orden.id_orden_compra),
      label: `OC #${orden.id_orden_compra} · ${formatearFechaSinHora(orden.fecha_emision)}`,
    })),
  ]

  const opcionesOrigen: SelectOption[] = [
    { value: '', label: '— Sin comprobante de origen —' },
    ...(comprobantesOrigen?.data ?? []).map((comprobante) => ({
      value: String(comprobante.id_comprobante_proveedor),
      label: `${nombresPorTipo.get(comprobante.FK_tipo_comprobante) ?? 'Comprobante'} ${formatearNumeroComprobante(comprobante)}`,
    })),
  ]

  const alicuota = Number.isFinite(alicuotaSeleccionada) ? alicuotaSeleccionada : 0
  const subtotalesPorLinea = detalle.map(subtotalLinea)
  const neto = redondear(subtotalesPorLinea.reduce((acumulado, valor) => acumulado + valor, 0))
  const iva = redondear((neto * alicuota) / 100)
  const total = redondear(neto + iva)
  const errorDetalle = errors.detalle?.message

  // El proveedor anterior, para resetear la OC y el origen si cambia.
  const proveedorAnteriorRef = useRef(proveedorSeleccionado)

  useEffect(() => {
    if (!open) return

    reset(valoresIniciales())
    setErrorGeneral(null)
    setConfirmarDescarte(false)
    setConfirmarRegistro(false)
    setPayloadAConfirmar(null)
    setBusquedaProveedor('')
    proveedorAnteriorRef.current = ''
  }, [open, reset])

  useEffect(() => {
    if (proveedorAnteriorRef.current === proveedorSeleccionado) return
    proveedorAnteriorRef.current = proveedorSeleccionado
    setValue('FK_orden_compra', '')
    setValue('FK_comprobante_origen', '')
  }, [proveedorSeleccionado, setValue])

  useEffect(() => {
    if (!error) return
    setErrorGeneral(repartirErrorDelBackend(error, setError))
  }, [error, setError])

  function guardarBorrador() {
    setErrorGeneral(null)
    void handleSubmit((payload) => onGuardarBorrador(payload))()
  }

  function pedirConfirmacionDeRegistro() {
    setErrorGeneral(null)
    void handleSubmit((payload) => {
      if (payload.detalle.length === 0) {
        setError('detalle', {
          message: 'Agregá al menos una línea para poder confirmar y registrar el comprobante',
        })
        return
      }
      setPayloadAConfirmar(payload)
      setConfirmarRegistro(true)
    })()
  }

  function confirmarRegistrar() {
    if (!payloadAConfirmar) return
    onConfirmar(payloadAConfirmar)
  }

  // Cerrar con datos a medio cargar pide confirmación; con un envío en curso no
  // se cierra directamente.
  function intentarCerrar() {
    if (cargando) return

    if (isDirty) {
      setConfirmarDescarte(true)
      return
    }

    onClose()
  }

  return (
    <>
      <Modal
        open={open}
        onClose={intentarCerrar}
        title="Nuevo comprobante"
        icon={<Receipt />}
        size="lg"
        closeOnEscape={!cargando && !confirmarDescarte && !confirmarRegistro}
        closeOnOverlayClick={!cargando && !confirmarDescarte && !confirmarRegistro}
        footer={
          <>
            <Button variant="error" icon={<X />} onClick={intentarCerrar} disabled={cargando}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={guardarBorrador}
              loading={loadingBorrador}
              disabled={cargando || !isValid}
            >
              Guardar borrador
            </Button>
            <Button
              variant="success"
              icon={<Check />}
              onClick={pedirConfirmacionDeRegistro}
              loading={loadingConfirmar}
              disabled={cargando || !isValid}
            >
              Confirmar y registrar
            </Button>
          </>
        }
      >
        <form
          id={ID_FORM}
          className="flex flex-col gap-4"
          onSubmit={(evento) => evento.preventDefault()}
        >
          {errorGeneral && (
            <div role="alert" className="border-error/30 bg-error/10 rounded-md border px-4 py-3">
              <p className="text-error text-xs">{errorGeneral}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-end gap-3">
              <Select
                label="Tipo de comprobante"
                required
                placeholder={
                  cargandoTipos ? 'Cargando tipos…' : 'Seleccionar tipo de comprobante'
                }
                disabled={cargandoTipos}
                options={opcionesTipo}
                error={errors.FK_tipo_comprobante?.message}
                className="flex-1"
                {...register('FK_tipo_comprobante')}
              />

              {tipoElegido && (
                <Badge
                  variant={tipoElegido.aumenta_saldo ? 'active' : 'error'}
                  dot={false}
                  className="mb-2.5"
                >
                  {tipoElegido.aumenta_saldo ? (
                    <TrendingUp className="size-3.5" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="size-3.5" aria-hidden="true" />
                  )}
                  {tipoElegido.aumenta_saldo ? 'Aumenta el saldo' : 'Disminuye el saldo'}
                </Badge>
              )}
            </div>

            <Controller
              name="FK_proveedor"
              control={control}
              render={({ field }) => (
                <Combobox
                  label="Proveedor"
                  required
                  placeholder="Buscar proveedor"
                  minChars={0}
                  value={field.value}
                  onChange={field.onChange}
                  options={opcionesProveedor}
                  onSearch={setBusquedaProveedor}
                  loading={cargandoProveedores}
                  hasMoreResults={hayMasProveedores}
                  disabled={cargando}
                  error={errors.FK_proveedor?.message}
                />
              )}
            />

            <Input
              label="Letra"
              required
              maxLength={1}
              placeholder="A"
              className="uppercase"
              disabled={cargando}
              error={errors.letra?.message}
              {...register('letra')}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Punto de venta"
                required
                type="number"
                min={1}
                disabled={cargando}
                error={errors.punto_de_venta?.message}
                {...register('punto_de_venta', { valueAsNumber: true })}
              />

              <Input
                label="Número"
                required
                type="number"
                min={1}
                disabled={cargando}
                error={errors.numero?.message}
                {...register('numero', { valueAsNumber: true })}
              />
            </div>

            <Input
              label="Fecha de emisión"
              required
              type="date"
              max={hoyIso()}
              disabled={cargando}
              error={errors.fecha_emision?.message}
              {...register('fecha_emision')}
            />

            <Input
              label="Fecha de vencimiento"
              required
              type="date"
              disabled={cargando}
              error={errors.fecha_vencimiento?.message}
              {...register('fecha_vencimiento')}
            />

            <Select
              label="Orden de compra vinculada"
              placeholder="Elegí primero un proveedor"
              disabled={cargando || !hayProveedor}
              options={opcionesOrdenCompra}
              helperText={
                hayProveedor
                  ? cargandoOrdenesCompra
                    ? 'Buscando órdenes de compra…'
                    : 'Opcional'
                  : 'Se habilita al elegir un proveedor'
              }
              error={errors.FK_orden_compra?.message}
              {...register('FK_orden_compra')}
            />

            <Select
              label="Comprobante de origen"
              placeholder="Elegí primero un proveedor"
              disabled={cargando || !hayProveedor}
              options={opcionesOrigen}
              helperText={
                hayProveedor
                  ? cargandoOrigen
                    ? 'Buscando comprobantes…'
                    : 'Opcional e informativo: deja constancia de qué comprobante lo motivó'
                  : 'Se habilita al elegir un proveedor'
              }
              error={errors.FK_comprobante_origen?.message}
              {...register('FK_comprobante_origen')}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-content text-sm font-medium">Detalle del comprobante</span>
              <Button
                type="button"
                size="sm"
                variant="primary"
                icon={<Plus />}
                onClick={() => append({ ...LINEA_VACIA })}
                disabled={cargando}
              >
                Agregar línea
              </Button>
            </div>

            {errorDetalle && <p className="text-error text-xs">{errorDetalle}</p>}

            <div className="flex flex-col gap-3">
              {fields.map((field, index) => (
                <DetalleLineaComprobanteRow
                  key={field.id}
                  index={index}
                  control={control}
                  register={register}
                  onRemove={() => remove(index)}
                  canRemove={!cargando}
                  subtotal={subtotalesPorLinea[index] ?? 0}
                  errors={errors.detalle?.[index]}
                />
              ))}
            </div>
          </div>

          <div className="border-subtle flex flex-col items-end gap-3 border-t pt-3">
            <Input
              label="Alícuota de IVA (%)"
              required
              type="number"
              min={0}
              max={100}
              step="0.01"
              className="w-40"
              disabled={cargando}
              error={errors.alicuota_iva?.message}
              {...register('alicuota_iva', { valueAsNumber: true })}
            />

            <dl className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between gap-8">
                <dt className="text-content-muted">Importe neto</dt>
                <dd className="text-content w-32 text-right font-medium">
                  {formatearMoneda(neto)}
                </dd>
              </div>
              <div className="flex justify-between gap-8">
                <dt className="text-content-muted">IVA ({alicuota}%)</dt>
                <dd className="text-content w-32 text-right font-medium">{formatearMoneda(iva)}</dd>
              </div>
              <div className="flex justify-between gap-8">
                <dt className="text-content font-medium">Importe total</dt>
                <dd className="text-content w-32 text-right text-lg font-semibold">
                  {formatearMoneda(total)}
                </dd>
              </div>
            </dl>
          </div>

          <Input
            label="Observaciones"
            multiline
            placeholder="Texto breve para identificar el comprobante"
            disabled={cargando}
            error={errors.observaciones?.message}
            {...register('observaciones')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmarRegistro}
        onCancel={() => setConfirmarRegistro(false)}
        onConfirm={confirmarRegistrar}
        variant="reactivar"
        eyebrow="Confirmar y registrar"
        eyebrowIcon={<Check />}
        title="¿Confirmar y registrar este comprobante?"
        details={
          payloadAConfirmar
            ? [
                { label: 'Líneas', value: String(payloadAConfirmar.detalle.length) },
                { label: 'Importe total', value: formatearMoneda(total) },
              ]
            : []
        }
        note="Una vez registrado, la cabecera y el detalle dejan de poder editarse."
        confirmLabel="Confirmar y registrar"
        confirmIcon={<Check />}
        loading={loadingConfirmar}
        error={confirmarRegistro && error ? formatearMensajeError(error.message) : null}
      />

      <ConfirmDialog
        open={confirmarDescarte}
        onCancel={() => setConfirmarDescarte(false)}
        onConfirm={() => {
          setConfirmarDescarte(false)
          onClose()
        }}
        eyebrow="Cambios sin guardar"
        eyebrowIcon={<TriangleAlert />}
        title="¿Descartar este comprobante?"
        note="Lo que cargaste en el formulario se va a perder."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
      />
    </>
  )
}

/** Los campos de la cabecera, para saber qué issues del backend son de campo. */
const CAMPOS = [
  'FK_tipo_comprobante',
  'FK_proveedor',
  'FK_orden_compra',
  'FK_comprobante_origen',
  'letra',
  'punto_de_venta',
  'numero',
  'fecha_emision',
  'fecha_vencimiento',
  'observaciones',
  'alicuota_iva',
  'detalle',
] as const
type CampoDelFormulario = (typeof CAMPOS)[number]

function esCampoDelFormulario(campo: string): campo is CampoDelFormulario {
  return CAMPOS.includes(campo as CampoDelFormulario)
}

/** Manda cada error del backend a donde corresponda y devuelve lo que quedó sin dueño, para el banner. */
function repartirErrorDelBackend(
  error: ApiErrorResponse,
  setError: UseFormSetError<ComprobanteFormValues>
): string | null {
  if (error.statusCode === 400 && esArrayDeValidationIssues(error.message)) {
    const issuesDeCampo = error.message.filter((issue) => esCampoDelFormulario(issue.campo))
    const resto = error.message.filter((issue) => !esCampoDelFormulario(issue.campo))

    for (const issue of issuesDeCampo) {
      setError(issue.campo as CampoDelFormulario, { message: issue.error })
    }

    return resto.length > 0 ? formatearMensajeError(resto) : null
  }

  return formatearMensajeError(error.message)
}