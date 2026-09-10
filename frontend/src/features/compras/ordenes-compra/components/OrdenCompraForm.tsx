import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import type { UseFormSetError } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ClipboardList, Plus, TriangleAlert, X } from 'lucide-react'
import { useDepositos } from '@/features/almacen/deposito/hooks/useDepositos'
import { useProveedores } from '@/features/compras/proveedores/hooks/useProveedores'
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Combobox } from '@/shared/components/ui/Combobox'
import type { ComboboxOption } from '@/shared/components/ui/Combobox'
import { Input } from '@/shared/components/ui/Input'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { esArrayDeValidationIssues, formatearMensajeError } from '@/shared/utils/apiError'
import { DetalleLineaOrdenCompraRow } from './DetalleLineaOrdenCompraRow'
import { ordenCompraFormSchema } from '../types/ordenCompra.schema'
import type {
  LineaOrdenCompraFormValues,
  OrdenCompraFormOutput,
  OrdenCompraFormValues,
} from '../types/ordenCompra.schema'
import { hoyIso } from '../utils/fechaOrdenCompra'
import { formatearMoneda } from '../utils/formatearMoneda'

const ID_FORM = 'form-orden-compra'

const LINEA_VACIA: LineaOrdenCompraFormValues = { FK_articulo: '', cantidad: 1, precio_unitario: 0 }

function valoresIniciales(): OrdenCompraFormValues {
  return {
    fecha_emision: hoyIso(),
    fecha_entrega_solicitada: '',
    FK_proveedor: '',
    FK_deposito: '',
    observaciones: '',
    detalle: [LINEA_VACIA],
  }
}

/** Redondeo a 2 decimales, igual que `OrdenCompraService.redondear` en el backend. */
function redondear(valor: number): number {
  return Math.round(valor * 100) / 100
}

function subtotalLinea(linea: { cantidad: number; precio_unitario: number }): number {
  if (!Number.isFinite(linea.cantidad) || !Number.isFinite(linea.precio_unitario)) return 0
  return redondear(linea.cantidad * linea.precio_unitario)
}

interface OrdenCompraFormProps {
  open: boolean
  onClose: () => void
  onGuardarBorrador: (payload: OrdenCompraFormOutput) => void
  onConfirmarYEmitir: (payload: OrdenCompraFormOutput) => void
  loadingBorrador?: boolean
  loadingConfirmar?: boolean
  /** Error del último intento (guardar borrador o confirmar) que la página no resolvió sola. */
  error?: ApiErrorResponse | null
}

/**
 * Modal de alta de una orden de compra: cabecera (proveedor, depósito y
 * fechas) + grilla de detalle, con subtotales y total recalculados en vivo.
 *
 * Dos acciones de guardado, igual que el ciclo de vida del backend:
 * - "Guardar borrador": crea la orden en BORRADOR: puede no tener líneas
 *   todavía, se puede seguir editando después.
 * - "Confirmar y emitir": pide al menos una línea y, antes de mandar nada,
 *   muestra un `ConfirmDialog` con el resumen —al emitirse, la orden deja de
 *   ser editable.
 */
export function OrdenCompraForm({
  open,
  onClose,
  onGuardarBorrador,
  onConfirmarYEmitir,
  loadingBorrador = false,
  loadingConfirmar = false,
  error = null,
}: OrdenCompraFormProps) {
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)
  const [confirmarEmision, setConfirmarEmision] = useState(false)
  const [payloadAEmitir, setPayloadAEmitir] = useState<OrdenCompraFormOutput | null>(null)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [busquedaProveedor, setBusquedaProveedor] = useState('')
  const [busquedaDeposito, setBusquedaDeposito] = useState('')

  const cargando = loadingBorrador || loadingConfirmar

  const { data: proveedores, isFetching: cargandoProveedores } = useProveedores({
    busqueda: busquedaProveedor || undefined,
    limit: 20,
  })
  const { data: depositos, isFetching: cargandoDepositos } = useDepositos({
    nombre: busquedaDeposito || undefined,
    estado: true,
    limit: 20,
  })

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isValid },
  } = useForm<OrdenCompraFormValues, unknown, OrdenCompraFormOutput>({
    resolver: zodResolver(ordenCompraFormSchema),
    defaultValues: valoresIniciales(),
    mode: 'onChange',
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'detalle' })
  const detalle = watch('detalle')

  useEffect(() => {
    if (!open) return

    reset(valoresIniciales())
    setErrorGeneral(null)
    setConfirmarDescarte(false)
    setConfirmarEmision(false)
    setPayloadAEmitir(null)
    setBusquedaProveedor('')
    setBusquedaDeposito('')
  }, [open, reset])

  useEffect(() => {
    if (!error) return

    setErrorGeneral(repartirErrorDelBackend(error, setError))
  }, [error, setError])

  const opcionesProveedor: ComboboxOption[] = (proveedores?.data ?? []).map((proveedor) => ({
    value: String(proveedor.id_proveedor),
    label: proveedor.razon_social,
  }))
  const hayMasProveedores = (proveedores?.meta.total ?? 0) > (proveedores?.data.length ?? 0)

  const opcionesDeposito: ComboboxOption[] = (depositos?.data ?? []).map((deposito) => ({
    value: String(deposito.id_deposito),
    label: `${deposito.nombre} (${deposito.es_obrador ? 'Obrador' : 'Depósito central'})`,
  }))
  const hayMasDepositos = (depositos?.meta.total ?? 0) > (depositos?.data.length ?? 0)

  const subtotalesPorLinea = detalle.map(subtotalLinea)
  const total = redondear(subtotalesPorLinea.reduce((acumulado, valor) => acumulado + valor, 0))
  const errorDetalle = errors.detalle?.message

  function guardarBorrador() {
    setErrorGeneral(null)
    void handleSubmit((payload) => onGuardarBorrador(payload))()
  }

  function pedirConfirmacionDeEmision() {
    setErrorGeneral(null)
    void handleSubmit((payload) => {
      if (payload.detalle.length === 0) {
        setError('detalle', {
          message: 'Agregá al menos una línea para poder confirmar y emitir la orden',
        })
        return
      }
      setPayloadAEmitir(payload)
      setConfirmarEmision(true)
    })()
  }

  function confirmarEmitir() {
    if (!payloadAEmitir) return
    onConfirmarYEmitir(payloadAEmitir)
  }

  // Cerrar con datos a medio cargar pide confirmación; con un envío en curso no se cierra directamente.
  function intentarCerrar() {
    if (cargando) return

    const huboCambios =
      detalle.some((linea) => linea.FK_articulo !== '') ||
      watch('FK_proveedor') !== '' ||
      watch('FK_deposito') !== '' ||
      watch('observaciones') !== ''

    if (huboCambios) {
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
        title="Nueva orden de compra"
        icon={<ClipboardList />}
        size="lg"
        closeOnEscape={!cargando && !confirmarDescarte && !confirmarEmision}
        closeOnOverlayClick={!cargando && !confirmarDescarte && !confirmarEmision}
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
              onClick={pedirConfirmacionDeEmision}
              loading={loadingConfirmar}
              disabled={cargando || !isValid}
            >
              Confirmar y emitir
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
              label="Fecha de entrega solicitada"
              type="date"
              disabled={cargando}
              helperText="Opcional"
              error={errors.fecha_entrega_solicitada?.message}
              {...register('fecha_entrega_solicitada')}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <Controller
              name="FK_deposito"
              control={control}
              render={({ field }) => (
                <Combobox
                  label="Depósito u obrador de destino"
                  required
                  placeholder="Buscar depósito u obrador"
                  minChars={0}
                  value={field.value}
                  onChange={field.onChange}
                  options={opcionesDeposito}
                  onSearch={setBusquedaDeposito}
                  loading={cargandoDepositos}
                  hasMoreResults={hayMasDepositos}
                  disabled={cargando}
                  error={errors.FK_deposito?.message}
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-content text-sm font-medium">Detalle de la orden</span>
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
                <DetalleLineaOrdenCompraRow
                  key={field.id}
                  index={index}
                  control={control}
                  register={register}
                  onRemove={() => remove(index)}
                  canRemove={!cargando}
                  idsExcluidos={detalle
                    .filter((_, i) => i !== index)
                    .map((linea) => Number(linea.FK_articulo))
                    .filter((id) => !Number.isNaN(id))}
                  subtotal={subtotalesPorLinea[index] ?? 0}
                  errors={errors.detalle?.[index]}
                />
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-subtle pt-3">
              <span className="text-content text-sm font-medium">Total de la orden</span>
              <span className="text-content text-lg font-semibold">{formatearMoneda(total)}</span>
            </div>
          </div>

          <Input
            label="Observaciones"
            multiline
            placeholder="Texto breve para identificar la orden"
            disabled={cargando}
            error={errors.observaciones?.message}
            {...register('observaciones')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmarEmision}
        onCancel={() => setConfirmarEmision(false)}
        onConfirm={confirmarEmitir}
        variant="reactivar"
        eyebrow="Confirmar y emitir"
        eyebrowIcon={<Check />}
        title="¿Confirmar y emitir esta orden de compra?"
        details={
          payloadAEmitir
            ? [
                { label: 'Líneas', value: String(payloadAEmitir.detalle.length) },
                { label: 'Total', value: formatearMoneda(total) },
              ]
            : []
        }
        note="Una vez emitida, la cabecera y el detalle dejan de poder editarse."
        confirmLabel="Confirmar y emitir"
        confirmIcon={<Check />}
        loading={loadingConfirmar}
        error={confirmarEmision && error ? formatearMensajeError(error.message) : null}
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
        title="¿Descartar esta orden de compra?"
        note="Lo que cargaste en el formulario se va a perder."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
      />
    </>
  )
}

/** Los campos de cabecera del formulario, para saber qué issues del backend son de campo. */
const CAMPOS = [
  'fecha_emision',
  'fecha_entrega_solicitada',
  'FK_proveedor',
  'FK_deposito',
  'observaciones',
  'detalle',
] as const
type CampoDelFormulario = (typeof CAMPOS)[number]

function esCampoDelFormulario(campo: string): campo is CampoDelFormulario {
  return CAMPOS.includes(campo as CampoDelFormulario)
}

/** Manda cada error del backend a donde corresponda y devuelve lo que quedó sin dueño, para el banner. */
function repartirErrorDelBackend(
  error: ApiErrorResponse,
  setError: UseFormSetError<OrdenCompraFormValues>
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
