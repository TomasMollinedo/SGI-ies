import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormSetError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarClock, HandCoins, X } from 'lucide-react'
import type { EstadoComercial } from '@/features/comercializacion/publicaciones/types/publicacion.types'
import { AlertaInline } from '@/features/comercializacion/publicaciones/components/AlertaInline'
import { Modal } from '@/shared/components/common/Modal'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { esArrayDeValidationIssues, formatearMensajeError } from '@/shared/utils/apiError'
import { AyudaDePrecio } from './AyudaDePrecio'
import { PrevisualizacionCuotas } from './PrevisualizacionCuotas'
import {
  MOTIVO_BLOQUEO_POR_VENTA,
  MOTIVO_CONDICIONES_ESTRUCTURALES,
  OPCIONES_PERIODICIDAD,
  OPCIONES_TIPO_PLAN,
  tieneVenta,
} from '../config/planPago.config'
import {
  useCrearPlanPago,
  useEditarPlanPago,
  usePlanPagoDetalle,
  useSimularCuotas,
} from '../hooks/usePlanesPago'
import {
  VALORES_INICIALES,
  esCampoDelFormulario,
  planPagoFormSchema,
} from '../types/planPago.schema'
import type {
  CampoFormulario,
  PlanPagoFormOutput,
  PlanPagoFormValues,
} from '../types/planPago.schema'
import type { PlanPago, SimularCuotasPayload } from '../types/planPago.types'
import { calcularGananciaImplicita, calcularPrecioSugerido } from '../utils/calculoPrecio'
import { aNumeroDeTexto } from '../utils/decimal'

/**
 * La simulación no lleva nombre (es un cálculo puro), pero el schema del
 * formulario sí lo exige. Este relleno existe solo para poder reusar ese
 * schema —uno solo, el mismo que valida el alta— al armar el payload de la
 * previsualización.
 */
const NOMBRE_PARA_SIMULAR = 'Previsualización'

/** Los campos de los que depende el cronograma: los que se validan al previsualizar. */
const CAMPOS_CONDICIONES = [
  'tipo',
  'precio',
  'anticipo_porcentaje',
  'anticipo_monto',
  'cantidad_cuotas',
  'periodicidad',
] as const satisfies readonly CampoFormulario[]

interface PlanPagoFormProps {
  onClose: () => void
  idPublicacion: number
  /** Costo de la unidad, para las ayudas de cálculo. `null` si no se pudo leer. */
  costo: number | null
  estadoComercial: EstadoComercial
  /** Plan a editar. `null` es un alta. */
  idPlan: number | null
  onGuardado: () => void
}

/**
 * Alta y edición de un plan de pago (HU-22), en un modal.
 *
 * Qué se puede tocar, y por qué:
 * - En el ALTA está todo abierto, salvo lo que no aplica al tipo elegido.
 * - En la EDICIÓN las condiciones estructurales (tipo, anticipo, cuotas,
 *   periodicidad) quedan deshabilitadas: cambiarlas dejaría a los planes ya
 *   adheridos describiendo condiciones distintas a las pactadas, así que el
 *   backend las rechaza con un 400. Se deshabilitan acá para que el usuario ni
 *   lo intente. El nombre tampoco se edita: el backend lo descarta en silencio.
 * - Si la publicación ya tiene una venta (EN_PLAN_DE_PAGO o VENDIDA), precio,
 *   porcentaje y margen también quedan bloqueados: el backend devuelve 409, y
 *   es mejor explicarlo antes que hacer chocar al usuario con el error.
 *
 * El estado (activo/inactivo) NO se toca desde acá aunque el PATCH lo permita:
 * cambiarlo tiene consecuencias que hay que explicar antes (ver
 * `CambiarEstadoPlanModal`), así que vive en su propia acción con su
 * confirmación.
 */
export function PlanPagoForm({
  onClose,
  idPublicacion,
  costo,
  estadoComercial,
  idPlan,
  onGuardado,
}: PlanPagoFormProps) {
  const toast = useToast()
  const esEdicion = idPlan !== null
  const bloqueadoPorVenta = esEdicion && tieneVenta(estadoComercial)

  const { data: plan, isLoading: cargandoPlan, error: errorPlan } = usePlanPagoDetalle(idPlan)
  const crear = useCrearPlanPago()
  const editar = useEditarPlanPago()
  const simular = useSimularCuotas()

  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  /**
   * Las condiciones con las que se simuló, serializadas. Si las actuales
   * dejan de coincidir, el cronograma que está en pantalla ya no corresponde y
   * se marca como desactualizado en vez de mostrarse como si fuera vigente.
   */
  const [condicionesSimuladas, setCondicionesSimuladas] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    getValues,
    trigger,
    formState: { errors, isValid },
  } = useForm<PlanPagoFormValues, unknown, PlanPagoFormOutput>({
    resolver: zodResolver(planPagoFormSchema),
    defaultValues: VALORES_INICIALES,
    mode: 'onChange',
  })

  // El detalle llega después del primer render (lo pide el modal al abrirse),
  // así que la precarga va en un efecto y no en `defaultValues`.
  useEffect(() => {
    if (!plan) return
    reset(valoresDesdePlan(plan))
  }, [plan, reset])

  const tipo = watch('tipo')
  const precio = watch('precio')
  const porcentajeGanancia = watch('porcentaje_ganancia')
  const margen = watch('margen')
  const anticipoPorcentaje = watch('anticipo_porcentaje')
  const anticipoMonto = watch('anticipo_monto')
  const cantidadCuotas = watch('cantidad_cuotas')
  const periodicidad = watch('periodicidad')

  const esContado = tipo === 'CONTADO'
  const guardando = crear.isPending || editar.isPending

  const porcentajeNumero = aNumeroDeTexto(porcentajeGanancia)
  const margenNumero = aNumeroDeTexto(margen)
  const precioNumero = aNumeroDeTexto(precio)

  const precioSugerido = calcularPrecioSugerido(costo, porcentajeNumero, margenNumero)
  // Misma condición que `PlanPagoService.calcularGananciaImplicita`: el dato
  // solo tiene sentido cuando el precio se escribió a mano. Si el usuario cargó
  // porcentaje o margen, el porcentaje real es el suyo.
  const gananciaImplicita =
    porcentajeNumero === null && margenNumero === null
      ? calcularGananciaImplicita(costo, precioNumero)
      : null

  // El anticipo se carga por porcentaje O por monto: en cuanto uno tiene algo,
  // el otro se deshabilita (y se limpia, por las dudas).
  const hayAnticipoPorcentaje = anticipoPorcentaje.trim() !== ''
  const hayAnticipoMonto = anticipoMonto.trim() !== ''
  const anticipoEstructural = esContado || esEdicion

  const condicionesActuales = JSON.stringify([
    tipo,
    precio,
    anticipoPorcentaje,
    anticipoMonto,
    cantidadCuotas,
    periodicidad,
  ])
  const previsualizacionDesactualizada =
    condicionesSimuladas !== null && condicionesSimuladas !== condicionesActuales

  function limpiarOtroAnticipo(campo: 'anticipo_porcentaje' | 'anticipo_monto') {
    const opuesto = campo === 'anticipo_porcentaje' ? 'anticipo_monto' : 'anticipo_porcentaje'
    if (getValues(opuesto) !== '') setValue(opuesto, '', { shouldValidate: true })
  }

  /** Al pasar a contado se limpia todo lo que no aplica, para no mandar algo que el backend rechaza. */
  function alCambiarTipo(valor: string) {
    if (valor !== 'CONTADO') return

    setValue('anticipo_porcentaje', '', { shouldValidate: true })
    setValue('anticipo_monto', '', { shouldValidate: true })
    setValue('cantidad_cuotas', '', { shouldValidate: true })
    setValue('periodicidad', '', { shouldValidate: true })
  }

  async function previsualizar() {
    setErrorGeneral(null)

    // Solo las condiciones: para previsualizar no hace falta el nombre.
    const condicionesValidas = await trigger(CAMPOS_CONDICIONES)
    if (!condicionesValidas) return

    const parseado = planPagoFormSchema.safeParse({
      ...getValues(),
      nombre: NOMBRE_PARA_SIMULAR,
    })
    if (!parseado.success) return

    const condiciones = condicionesActuales
    simular.mutate(payloadDeSimulacion(parseado.data), {
      onSuccess: () => setCondicionesSimuladas(condiciones),
    })
  }

  function guardar(valores: PlanPagoFormOutput) {
    setErrorGeneral(null)

    if (esEdicion) {
      editar.mutate(
        {
          id: idPlan,
          payload: {
            precio: valores.precio,
            porcentaje_ganancia: valores.porcentaje_ganancia,
            margen: valores.margen,
          },
        },
        {
          onSuccess: (actualizado) => {
            toast.success(`Plan "${actualizado.nombre}" actualizado.`)
            // El precio quedó por debajo del costo: es un aviso posterior, el
            // cambio ya se guardó y no se revierte.
            if (actualizado.warning) toast.warning(actualizado.warning)
            onGuardado()
          },
          onError: (falla) => setErrorGeneral(repartirErrorDelBackend(falla, setError)),
        }
      )
      return
    }

    crear.mutate(
      {
        FK_publicacion: idPublicacion,
        nombre: valores.nombre,
        tipo: valores.tipo,
        precio: valores.precio,
        porcentaje_ganancia: valores.porcentaje_ganancia,
        margen: valores.margen,
        anticipo_porcentaje: valores.anticipo_porcentaje,
        anticipo_monto: valores.anticipo_monto,
        cantidad_cuotas: valores.cantidad_cuotas,
        periodicidad: valores.periodicidad,
      },
      {
        onSuccess: (creado) => {
          toast.success(`Plan "${creado.nombre}" creado.`)
          if (creado.warning) toast.warning(creado.warning)
          onGuardado()
        },
        onError: (falla) => setErrorGeneral(repartirErrorDelBackend(falla, setError)),
      }
    )
  }

  const titulo = esEdicion ? 'Editar plan de pago' : 'Nuevo plan de pago'
  const mostrandoCarga = esEdicion && cargandoPlan

  return (
    <Modal
      open
      onClose={onClose}
      title={titulo}
      icon={<HandCoins />}
      size="lg"
      closeOnEscape={!guardando}
      closeOnOverlayClick={!guardando}
      footer={
        <>
          <Button variant="error" icon={<X />} onClick={onClose} disabled={guardando}>
            {bloqueadoPorVenta ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!bloqueadoPorVenta && (
            <Button
              variant="success"
              onClick={() => void handleSubmit(guardar)()}
              loading={guardando}
              disabled={guardando || !isValid || mostrandoCarga}
            >
              {esEdicion ? 'Guardar cambios' : 'Crear plan'}
            </Button>
          )}
        </>
      }
    >
      {mostrandoCarga ? (
        <div className="flex justify-center py-10">
          <Spinner size={32} />
        </div>
      ) : errorPlan ? (
        <AlertaInline>{formatearMensajeError(errorPlan.message)}</AlertaInline>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={(evento) => evento.preventDefault()}>
          {errorGeneral && <AlertaInline>{errorGeneral}</AlertaInline>}

          {bloqueadoPorVenta && (
            <div
              role="status"
              className="border-warning/30 bg-warning/10 text-warning rounded-md border px-4 py-3 text-xs"
            >
              {MOTIVO_BLOQUEO_POR_VENTA}. Podés seguir activando o inactivando el plan desde el
              listado.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nombre del plan"
              required
              maxLength={100}
              placeholder="Ej. Contado 1-A"
              disabled={guardando || esEdicion}
              helperText={esEdicion ? 'El nombre del plan no se edita.' : undefined}
              error={errors.nombre?.message}
              {...register('nombre')}
            />

            <Select
              label="Tipo"
              required
              options={OPCIONES_TIPO_PLAN}
              disabled={guardando || esEdicion}
              helperText={esEdicion ? MOTIVO_CONDICIONES_ESTRUCTURALES : undefined}
              error={errors.tipo?.message}
              {...register('tipo', {
                onChange: (evento: React.ChangeEvent<HTMLSelectElement>) =>
                  alCambiarTipo(evento.target.value),
              })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Porcentaje de ganancia"
              type="number"
              step="0.01"
              min="0"
              placeholder="Opcional"
              disabled={guardando || bloqueadoPorVenta}
              helperText="Sobre el costo de la unidad."
              error={errors.porcentaje_ganancia?.message}
              {...register('porcentaje_ganancia')}
            />

            <Input
              label="Margen"
              type="number"
              step="0.01"
              min="0"
              placeholder="Opcional"
              disabled={guardando || bloqueadoPorVenta}
              helperText="Importe fijo que se suma al costo."
              error={errors.margen?.message}
              {...register('margen')}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
            <Input
              label="Precio"
              required
              type="number"
              step="0.01"
              min="0"
              disabled={guardando || bloqueadoPorVenta}
              helperText="El precio se carga a mano y es el que se guarda: no tiene por qué coincidir con el sugerido."
              error={errors.precio?.message}
              {...register('precio')}
            />

            <div className="sm:w-56">
              <AyudaDePrecio
                precioSugerido={precioSugerido}
                gananciaImplicita={gananciaImplicita}
                onUsarPrecioSugerido={() =>
                  setValue('precio', String(precioSugerido), {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                disabled={guardando || bloqueadoPorVenta}
              />
            </div>
          </div>

          <fieldset className="border-subtle flex flex-col gap-3 rounded-md border p-3">
            <legend className="text-content px-1 text-xs font-medium">Condiciones de pago</legend>

            {esContado ? (
              <Input
                label="Anticipo"
                readOnly
                value="100 % (contado)"
                helperText="En un plan de contado el anticipo es el 100% del precio."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Anticipo (%)"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  disabled={guardando || anticipoEstructural || hayAnticipoMonto}
                  helperText="Por porcentaje o por monto, no los dos."
                  error={errors.anticipo_porcentaje?.message}
                  {...register('anticipo_porcentaje', {
                    onChange: () => limpiarOtroAnticipo('anticipo_porcentaje'),
                  })}
                />

                <Input
                  label="Anticipo (monto)"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={guardando || anticipoEstructural || hayAnticipoPorcentaje}
                  helperText={esEdicion ? MOTIVO_CONDICIONES_ESTRUCTURALES : undefined}
                  error={errors.anticipo_monto?.message}
                  {...register('anticipo_monto', {
                    onChange: () => limpiarOtroAnticipo('anticipo_monto'),
                  })}
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Cantidad de cuotas"
                type="number"
                step="1"
                min="1"
                disabled={guardando || esContado || esEdicion}
                helperText={textoAyudaEstructural(esContado, esEdicion)}
                error={errors.cantidad_cuotas?.message}
                {...register('cantidad_cuotas')}
              />

              <Select
                label="Periodicidad"
                options={OPCIONES_PERIODICIDAD}
                placeholder="Elegí una periodicidad"
                disabled={guardando || esContado || esEdicion}
                helperText={textoAyudaEstructural(esContado, esEdicion)}
                error={errors.periodicidad?.message}
                {...register('periodicidad')}
              />
            </div>
          </fieldset>

          <div className="flex flex-col gap-3">
            <Button
              size="sm"
              icon={<CalendarClock />}
              onClick={() => void previsualizar()}
              loading={simular.isPending}
              disabled={guardando}
              className="self-start"
            >
              Previsualizar cuotas
            </Button>

            <PrevisualizacionCuotas
              cuotas={simular.data}
              cargando={simular.isPending}
              error={simular.error ? formatearMensajeError(simular.error.message) : null}
              desactualizada={previsualizacionDesactualizada}
            />
          </div>
        </form>
      )}
    </Modal>
  )
}

/** Por qué un campo estructural está deshabilitado: por el tipo de plan o por ser una edición. */
function textoAyudaEstructural(esContado: boolean, esEdicion: boolean): string | undefined {
  if (esContado) return 'No aplica en un plan de contado.'
  if (esEdicion) return MOTIVO_CONDICIONES_ESTRUCTURALES
  return undefined
}

/** Precarga del formulario con un plan existente. Los decimales del backend son strings: entran tal cual. */
function valoresDesdePlan(plan: PlanPago): PlanPagoFormValues {
  return {
    nombre: plan.nombre,
    tipo: plan.tipo,
    precio: plan.precio,
    porcentaje_ganancia: plan.porcentaje_ganancia,
    margen: plan.margen,
    // En contado el anticipo no se muestra como campo (es fijo en 100%), así
    // que no se precarga: iría a un input que no se renderiza.
    anticipo_porcentaje: plan.tipo === 'CONTADO' ? '' : (plan.anticipo_porcentaje ?? ''),
    anticipo_monto: plan.anticipo_monto ?? '',
    cantidad_cuotas: plan.cantidad_cuotas === null ? '' : String(plan.cantidad_cuotas),
    periodicidad: plan.periodicidad ?? '',
  }
}

/** Del formulario ya validado a lo que espera `POST /planes-pago/simular-cuotas`. */
function payloadDeSimulacion(valores: PlanPagoFormOutput): SimularCuotasPayload {
  return {
    tipo: valores.tipo,
    precio: valores.precio,
    anticipo_porcentaje: valores.anticipo_porcentaje,
    anticipo_monto: valores.anticipo_monto,
    cantidad_cuotas: valores.cantidad_cuotas,
    periodicidad: valores.periodicidad,
  }
}

/**
 * Manda cada issue del backend a su campo y devuelve lo que quedó sin dueño,
 * para el banner de arriba. Mismo criterio que `OrdenCompraForm`.
 */
function repartirErrorDelBackend(
  error: ApiErrorResponse,
  setError: UseFormSetError<PlanPagoFormValues>
): string | null {
  if (error.statusCode === 400 && esArrayDeValidationIssues(error.message)) {
    const deCampo = error.message.filter((issue) => esCampoDelFormulario(issue.campo))
    const resto = error.message.filter((issue) => !esCampoDelFormulario(issue.campo))

    for (const issue of deCampo) {
      setError(issue.campo as CampoFormulario, { message: issue.error })
    }

    return resto.length > 0 ? formatearMensajeError(resto) : null
  }

  return formatearMensajeError(error.message)
}
