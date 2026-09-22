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
import { formatearImporte } from '@/shared/utils/importe'
import { AyudaDePrecio } from './AyudaDePrecio'
import { PrevisualizacionCuotas } from './PrevisualizacionCuotas'
import {
  MOTIVO_BLOQUEO_POR_PLAN_INACTIVO,
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
import { calcularPrecioSugerido, calcularResultadoSobreCosto } from '../utils/calculoPrecio'
import {
  aMilesANumero,
  aNumero,
  aNumeroDeTexto,
  formatearMilesEnVivo,
  limitarADosDecimalesEnVivo,
  normalizarSeparadorDecimal,
  numeroAMilesTexto,
} from '../utils/decimal'

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
 * - Un plan INACTIVO tampoco es una oferta vigente: mismo bloqueo y mismo
 *   409, salvo que este modal se use para reactivarlo (ver
 *   `CambiarEstadoPlanModal`, que es la única vía para eso, no este form).
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

  // Sin venta, el otro motivo para congelar precio/%/margen es que el plan ya
  // esté inactivo: recién carga cuando `plan` llega, así que hasta entonces
  // da `false` (mismo momento en que los campos ni se muestran, ver `mostrandoCarga`).
  const planInactivo = esEdicion && plan !== undefined && !plan.estado
  const edicionEconomicaBloqueada = bloqueadoPorVenta || planInactivo
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
  // Margen tiene puntos de miles en pantalla (ver `formatearMilesEnVivo`), así
  // que un punto ahí no es decimal: usa su propio parser, no `aNumeroDeTexto`.
  const margenNumero = aMilesANumero(margen)
  const precioNumero = aMilesANumero(precio)

  const precioSugerido =
    precio.trim() === '' ? calcularPrecioSugerido(costo, porcentajeNumero, margenNumero) : null
  // A diferencia del precio sugerido, esto se calcula siempre que hay costo y
  // precio: es el efecto real del precio actual, se haya llegado a él con las
  // herramientas o pisando el sugerido a mano.
  const resultadoSobreCosto = calcularResultadoSobreCosto(costo, precioNumero)

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

  /**
   * DESVÍO A PROPÓSITO del enunciado de HU-22 ("[el % implícito] no reescribe
   * ni completa los campos de porcentaje de ganancia ni margen"): a pedido
   * expreso, acá SÍ se completa el campo porcentaje de ganancia con el
   * resultado en vivo cuando se toca el precio a mano.
   *
   * Se completa solo `porcentaje_ganancia`, nunca los dos a la vez: si se
   * cargaran ambos con el delta completo, `calcularPrecioSugerido` (que suma
   * costo + costo×% + margen) contaría ese mismo delta dos veces la próxima
   * vez que alguien reabra las herramientas. `margen` se limpia en su lugar.
   *
   * Un resultado negativo (precio por debajo del costo) NO se carga: las
   * columnas de porcentaje y margen exigen `>= 0` tanto en este schema como
   * en el del backend, y forzar un valor negativo dejaría el formulario
   * inválido justo en el caso que el enunciado pide poder guardar igual (con
   * advertencia). Ahí se limpian los dos, como antes.
   */
  function alEditarPrecioAMano(valorPrecio: string) {
    const resultado = calcularResultadoSobreCosto(costo, aMilesANumero(valorPrecio))

    if (resultado === null || resultado.porcentaje < 0) {
      setValue('porcentaje_ganancia', '', { shouldValidate: true })
      setValue('margen', '', { shouldValidate: true })
      return
    }

    setValue('porcentaje_ganancia', normalizarSeparadorDecimal(String(resultado.porcentaje)), {
      shouldValidate: true,
    })
    setValue('margen', '', { shouldValidate: true })
  }

  /**
   * A la inversa: tocar porcentaje de ganancia o margen invalida el precio
   * que hubiera cargado (a mano o copiado de una sugerencia anterior), porque
   * pasó a corresponder a otras condiciones. Se limpia en vez de dejarlo
   * como un valor viejo que ya no es el que esas herramientas describen.
   */
  function alEditarHerramientaDeCalculo() {
    if (getValues('precio') !== '') setValue('precio', '', { shouldValidate: true })
  }

  /**
   * Lo que se tipea en Porcentaje de ganancia siempre se ve con coma, se haya
   * tipeado con punto o con coma, y con hasta dos decimales — igual que
   * Margen, no deja escribir un tercero en vez de avisarlo recién al validar.
   */
  function alEscribirPorcentaje(valor: string) {
    const limitado = limitarADosDecimalesEnVivo(valor)
    if (limitado !== valor) setValue('porcentaje_ganancia', limitado, { shouldValidate: true })
    alEditarHerramientaDeCalculo()
  }

  /** Lo que se tipea en Margen se reformatea en vivo con puntos de miles (ver `formatearMilesEnVivo`). */
  function alEscribirMargen(valor: string) {
    const formateado = formatearMilesEnVivo(valor)
    if (formateado !== valor) setValue('margen', formateado, { shouldValidate: true })
    alEditarHerramientaDeCalculo()
  }
  /** Precio se muestra con puntos de miles mientras se escribe. */
  function alEscribirPrecio(valor: string) {
    const formateado = formatearMilesEnVivo(valor)

    if (formateado !== valor) {
      setValue('precio', formateado, {
        shouldValidate: true,
      })
    }

    alEditarPrecioAMano(formateado)
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
            {edicionEconomicaBloqueada ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!edicionEconomicaBloqueada && (
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

          {bloqueadoPorVenta ? (
            <div
              role="status"
              className="border-warning/30 bg-warning/10 text-warning rounded-md border px-4 py-3 text-xs"
            >
              {MOTIVO_BLOQUEO_POR_VENTA}. Podés seguir activando o inactivando el plan desde el
              listado.
            </div>
          ) : (
            planInactivo && (
              <div
                role="status"
                className="border-warning/30 bg-warning/10 text-warning rounded-md border px-4 py-3 text-xs"
              >
                {MOTIVO_BLOQUEO_POR_PLAN_INACTIVO}: activalo desde el listado para poder cambiar
                precio, porcentaje de ganancia o margen.
              </div>
            )
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
              type="text"
              inputMode="decimal"
              placeholder="Opcional"
              disabled={guardando || edicionEconomicaBloqueada}
              helperText="Sobre el costo de la unidad. Se puede combinar con el margen."
              error={errors.porcentaje_ganancia?.message}
              {...register('porcentaje_ganancia', {
                onChange: (evento: React.ChangeEvent<HTMLInputElement>) =>
                  alEscribirPorcentaje(evento.target.value),
              })}
            />

            <Input
              label="Margen"
              type="text"
              inputMode="decimal"
              placeholder="Opcional"
              disabled={guardando || edicionEconomicaBloqueada}
              helperText="Importe fijo que se suma al costo. Se puede combinar con el porcentaje."
              error={errors.margen?.message}
              {...register('margen', {
                onChange: (evento: React.ChangeEvent<HTMLInputElement>) =>
                  alEscribirMargen(evento.target.value),
              })}
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
              <Input
                label="Precio"
                required
                type="text"
                inputMode="decimal"
                placeholder="0"
                disabled={guardando || edicionEconomicaBloqueada}
                helperText="El precio se carga a mano y es el que se guarda: no tiene por qué coincidir con el sugerido."
                error={errors.precio?.message}
                {...register('precio', {
                  onChange: (evento: React.ChangeEvent<HTMLInputElement>) =>
                    alEscribirPrecio(evento.target.value),
                })}
              />

              {/* Al lado del precio, no adentro del panel de ayuda: es el dato con el que se compara de un vistazo. */}
              <fieldset className="border-subtle rounded-md border p-3 sm:w-44">
                <legend className="text-content px-1 text-xs font-medium">
                  Costo de la unidad
                </legend>
                <p className="text-content text-base font-semibold wrap-anywhere">
                  {costo === null ? '—' : formatearImporte(costo)}
                </p>
              </fieldset>
            </div>

            <AyudaDePrecio
              precioSugerido={precioSugerido}
              resultadoSobreCosto={resultadoSobreCosto}
              onUsarPrecioSugerido={() => {
                if (precioSugerido === null) return

                setValue('precio', numeroAMilesTexto(precioSugerido), {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }}
              disabled={guardando || edicionEconomicaBloqueada}
            />
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

/**
 * Precarga del formulario con un plan existente. Los decimales del backend
 * son strings con punto decimal (nunca miles) y entran tal cual en los
 * campos que se muestran igual — pero `porcentaje_ganancia` y `margen` ahora
 * se ven siempre con coma / con puntos de miles, así que hay que pasarlos por
 * el mismo formateo que corre mientras se tipea, si no se precargan crudos
 * ("26.67" en vez de "26,67", o "4000000" en vez de "4.000.000").
 */
function valoresDesdePlan(plan: PlanPago): PlanPagoFormValues {
  return {
    nombre: plan.nombre,
    tipo: plan.tipo,
    precio: aNumero(plan.precio) === null ? '' : numeroAMilesTexto(aNumero(plan.precio)!),
    porcentaje_ganancia: normalizarSeparadorDecimal(plan.porcentaje_ganancia),
    margen: aNumero(plan.margen) === null ? '' : numeroAMilesTexto(aNumero(plan.margen)!),
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
