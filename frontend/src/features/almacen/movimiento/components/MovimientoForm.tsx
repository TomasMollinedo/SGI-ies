import { useEffect, useRef } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ClipboardList, Plus, X } from 'lucide-react'
import { useDepositos } from '@/features/almacen/deposito/hooks/useDepositos'
import { useTiposMovimiento } from '@/features/almacen/tipo-movimiento/hooks/useTiposMovimiento'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Modal } from '@/shared/components/common/Modal'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import { DetalleLineaRow } from './DetalleLineaRow'
import { movimientoFormSchema } from '../types/movimiento.schema'
import type {
  LineaMovimientoFormValues,
  MovimientoFormOutput,
  MovimientoFormValues,
} from '../types/movimiento.schema'
import { ahoraParaInputLocal } from '../utils/fechaIso'

const ID_FORM = 'form-movimiento'

const LINEA_VACIA: LineaMovimientoFormValues = { FK_Stock: '', cantidad: 1, observacion: '' }

/**
 * La fecha arranca en el momento en que se abre el formulario, que es el caso
 * habitual, pero el usuario puede corregirla para cargar un movimiento que pasó
 * antes. Se recalcula en cada apertura, no una sola vez al importar el módulo.
 */
function valoresIniciales(): MovimientoFormValues {
  return {
    fecha_movimiento: ahoraParaInputLocal(),
    FK_TipoMovimiento: '',
    FK_Deposito: '',
    referencia: '',
    observaciones: '',
    detalle: [LINEA_VACIA],
  }
}

interface MovimientoFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: MovimientoFormOutput) => void
  loading?: boolean
}

/**
 * Modal de registro de un movimiento de stock. El flujo se revela en pasos: al
 * elegir el tipo de movimiento aparece el depósito, y al elegir el depósito
 * aparece la grilla de detalle (filtrada a las fichas de stock de ESE
 * depósito) junto con referencia y observaciones.
 *
 * Nota: no incluye ninguna lógica de Orden de Compra — "referencia" es un
 * campo de texto libre que sirve tanto para un N° de OC como de remito.
 */
export function MovimientoForm({ open, onClose, onSubmit, loading = false }: MovimientoFormProps) {
  const { data: tipos, isFetching: cargandoTipos } = useTiposMovimiento({
    estado: true,
    limit: 100,
  })
  const { data: depositos, isFetching: cargandoDepositos } = useDepositos({
    estado: true,
    limit: 100,
  })

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<MovimientoFormValues, unknown, MovimientoFormOutput>({
    resolver: zodResolver(movimientoFormSchema),
    defaultValues: valoresIniciales(),
  })

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'detalle' })

  const FK_TipoMovimiento = watch('FK_TipoMovimiento')
  const FK_Deposito = watch('FK_Deposito')
  const detalle = watch('detalle')

  const tipoElegido = tipos?.data.find(
    (tipo) => String(tipo.id_tipo_movimiento) === FK_TipoMovimiento
  )
  const depositoElegido = FK_Deposito !== ''

  // Las fichas de stock elegidas pertenecen a un depósito puntual: si el
  // usuario cambia de depósito con líneas ya cargadas, esas líneas quedan
  // inválidas (ficha de otro depósito), así que se reinicia el detalle.
  const depositoAnteriorRef = useRef(FK_Deposito)

  // Cada vez que se abre, el form arranca limpio.
  useEffect(() => {
    if (!open) return
    reset(valoresIniciales())
    depositoAnteriorRef.current = ''
  }, [open, reset])

  useEffect(() => {
    if (depositoAnteriorRef.current === FK_Deposito) return
    depositoAnteriorRef.current = FK_Deposito
    replace([LINEA_VACIA])
  }, [FK_Deposito, replace])

  const opcionesTipo: SelectOption[] = (tipos?.data ?? []).map((tipo) => ({
    value: String(tipo.id_tipo_movimiento),
    label: tipo.nombre,
  }))

  const opcionesDeposito: SelectOption[] = (depositos?.data ?? []).map((deposito) => ({
    value: String(deposito.id_deposito),
    label: `${deposito.nombre} (${deposito.es_obrador ? 'Obrador' : 'Depósito central'})`,
  }))

  const errorDetalle = errors.detalle?.message

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo movimiento"
      icon={<ClipboardList />}
      size="lg"
      footer={
        <>
          <Button variant="error" icon={<X />} onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="success" icon={<Check />} type="submit" form={ID_FORM} loading={loading}>
            Confirmar
          </Button>
        </>
      }
    >
      <form id={ID_FORM} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* La fecha del movimiento es un dato del negocio y la carga el
            usuario: es la que se ve en el listado. El momento en que se cargó
            el registro lo guarda el backend aparte (hora_creacion) y sale en la
            trazabilidad del detalle. */}
        <Input
          label="Fecha del movimiento"
          required
          type="datetime-local"
          // El backend rechaza las fechas futuras: el navegador ya no deja
          // elegirlas, y el schema lo vuelve a validar por las dudas.
          max={ahoraParaInputLocal()}
          helperText="Cuándo ocurrió el movimiento. Por defecto, ahora."
          error={errors.fecha_movimiento?.message}
          {...register('fecha_movimiento')}
        />

        <div className="flex items-end gap-3">
          <Select
            label="Tipo de movimiento"
            required
            placeholder={cargandoTipos ? 'Cargando tipos…' : 'Seleccionar tipo de movimiento'}
            disabled={cargandoTipos}
            options={opcionesTipo}
            error={errors.FK_TipoMovimiento?.message}
            className="flex-1"
            {...register('FK_TipoMovimiento')}
          />

          {tipoElegido && (
            <Badge
              variant={tipoElegido.indicador_entrada ? 'active' : 'inactive'}
              className="mb-2.5"
            >
              {tipoElegido.indicador_entrada ? 'Entrada' : 'Salida'}
            </Badge>
          )}
        </div>

        {tipoElegido && (
          <Select
            label="Depósito/obrador"
            required
            placeholder={cargandoDepositos ? 'Cargando depósitos…' : 'Seleccionar depósito'}
            disabled={cargandoDepositos}
            options={opcionesDeposito}
            error={errors.FK_Deposito?.message}
            {...register('FK_Deposito')}
          />
        )}

        {depositoElegido && (
          <>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-content text-sm font-medium">Detalle de movimiento</span>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  icon={<Plus />}
                  onClick={() => append({ ...LINEA_VACIA })}
                >
                  Agregar artículo
                </Button>
              </div>

              {errorDetalle && <p className="text-error text-xs">{errorDetalle}</p>}

              <div className="flex flex-col gap-3">
                {fields.map((field, index) => (
                  <DetalleLineaRow
                    key={field.id}
                    index={index}
                    control={control}
                    register={register}
                    onRemove={() => remove(index)}
                    canRemove={fields.length > 1}
                    FK_deposito={Number(FK_Deposito)}
                    idsExcluidos={detalle
                      .filter((_, i) => i !== index)
                      .map((linea) => Number(linea.FK_Stock))
                      .filter((id) => !Number.isNaN(id))}
                    errors={errors.detalle?.[index]}
                  />
                ))}
              </div>
            </div>

            <Input
              label="Referencia"
              placeholder="Ej: OC-0032, R-030 (opcional)"
              helperText="N° de orden de compra, remito u otra referencia libre"
              error={errors.referencia?.message}
              {...register('referencia')}
            />

            <Input
              label="Observaciones"
              multiline
              placeholder="Texto breve para identificar el registro"
              error={errors.observaciones?.message}
              {...register('observaciones')}
            />
          </>
        )}
      </form>
    </Modal>
  )
}
