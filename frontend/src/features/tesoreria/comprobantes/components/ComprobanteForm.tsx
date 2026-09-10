import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { UseFormSetError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Receipt, TrendingDown, TrendingUp, TriangleAlert, X } from 'lucide-react'
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
import { formatearFecha } from '@/shared/utils/fecha'
import { useComprobantes } from '../hooks/useComprobantes'
import { useOrdenesCompra } from '../hooks/useOrdenesCompra'
import { comprobanteFormSchema } from '../types/comprobante.schema'
import type { ComprobanteFormOutput, ComprobanteFormValues } from '../types/comprobante.schema'
import { hoyIso } from '../utils/fechaComprobante'
import { formatearNumeroComprobante } from '../utils/numeroComprobante'

const ID_FORM = 'form-comprobante'

/** Alícuota de IVA por defecto: la general en Argentina. El campo lo edita el usuario (T79). */
const ALICUOTA_IVA_DEFECTO = 21

/** Cuántas órdenes de compra / comprobantes de origen ofrece el selector (los más recientes). */
const LIMITE_VINCULABLES = 50

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
    detalle: [],
  }
}

interface ComprobanteFormProps {
  open: boolean
  onClose: () => void
  /** Alta como BORRADOR. Sin este prop el botón queda deshabilitado (se conecta en T79). */
  onGuardarBorrador?: (payload: ComprobanteFormOutput) => void
  /** Alta + confirmación. Sin este prop el botón queda deshabilitado (se conecta en T79). */
  onConfirmar?: (payload: ComprobanteFormOutput) => void
  loading?: boolean
  /** Error del backend que la página decidió no resolver sola. */
  error?: ApiErrorResponse | null
}

/**
 * Modal de alta de un comprobante de proveedor.
 *
 * T78 cubre solo la cabecera: tipo de comprobante (con un indicador de si
 * aumenta o disminuye el saldo), proveedor, orden de compra vinculada y
 * comprobante de origen (ambos opcionales y filtrados por el proveedor), letra,
 * punto de venta, número, fechas y observaciones. El detalle, la alícuota de
 * IVA, los totales en vivo y las acciones de guardado se agregan en T79.
 */
export function ComprobanteForm({
  open,
  onClose,
  onGuardarBorrador,
  onConfirmar,
  loading = false,
  error = null,
}: ComprobanteFormProps) {
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [busquedaProveedor, setBusquedaProveedor] = useState('')

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

  const proveedorSeleccionado = watch('FK_proveedor')
  const tipoSeleccionado = watch('FK_tipo_comprobante')
  const proveedorId = proveedorSeleccionado ? Number(proveedorSeleccionado) : undefined

  const tipoElegido = (tipos?.data ?? []).find(
    (tipo) => String(tipo.id_tipo_comprobante) === tipoSeleccionado
  )
  const nombresPorTipo = useMemo(
    () => new Map((tipos?.data ?? []).map((tipo) => [tipo.id_tipo_comprobante, tipo.nombre])),
    [tipos]
  )

  const hayProveedor = proveedorId !== undefined

  const { data: ordenesCompra, isFetching: cargandoOrdenesCompra } = useOrdenesCompra(
    { FK_proveedor: proveedorId, limit: LIMITE_VINCULABLES },
    { enabled: hayProveedor }
  )
  const { data: comprobantesOrigen, isFetching: cargandoOrigen } = useComprobantes(
    { FK_proveedor: proveedorId, estado: 'REGISTRADO', limit: LIMITE_VINCULABLES },
    { enabled: hayProveedor }
  )

  const cargando = loading

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
      label: `OC #${orden.id_orden_compra} · ${formatearFecha(orden.fecha_emision)}`,
    })),
  ]

  const opcionesOrigen: SelectOption[] = [
    { value: '', label: '— Sin comprobante de origen —' },
    ...(comprobantesOrigen?.data ?? []).map((comprobante) => ({
      value: String(comprobante.id_comprobante_proveedor),
      label: `${nombresPorTipo.get(comprobante.FK_tipo_comprobante) ?? 'Comprobante'} ${formatearNumeroComprobante(comprobante)}`,
    })),
  ]

  // El proveedor anterior, para resetear la OC y el origen si cambia: los que
  // había elegido pertenecían a otro proveedor.
  const proveedorAnteriorRef = useRef(proveedorSeleccionado)

  useEffect(() => {
    if (!open) return

    reset(valoresIniciales())
    setErrorGeneral(null)
    setConfirmarDescarte(false)
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
    if (!onGuardarBorrador) return
    setErrorGeneral(null)
    void handleSubmit((payload) => onGuardarBorrador(payload))()
  }

  function confirmar() {
    if (!onConfirmar) return
    setErrorGeneral(null)
    void handleSubmit((payload) => onConfirmar(payload))()
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
        closeOnEscape={!cargando && !confirmarDescarte}
        closeOnOverlayClick={!cargando && !confirmarDescarte}
        footer={
          <>
            <Button variant="error" icon={<X />} onClick={intentarCerrar} disabled={cargando}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={guardarBorrador}
              loading={cargando}
              disabled={!onGuardarBorrador || cargando || !isValid}
            >
              Guardar borrador
            </Button>
            <Button
              variant="success"
              icon={<Check />}
              onClick={confirmar}
              loading={cargando}
              disabled={!onConfirmar || cargando || !isValid}
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

          <Input
            label="Observaciones"
            multiline
            placeholder="Texto breve para identificar el comprobante"
            disabled={cargando}
            error={errors.observaciones?.message}
            {...register('observaciones')}
          />

          <p className="border-subtle text-content-muted flex items-center gap-2 rounded-md border border-dashed px-4 py-3 text-xs">
            <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
            El detalle, la alícuota de IVA y los totales se cargan en el siguiente paso.
          </p>
        </form>
      </Modal>

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