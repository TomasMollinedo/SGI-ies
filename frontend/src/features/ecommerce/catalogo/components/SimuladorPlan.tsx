import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Calculator, Info } from 'lucide-react'
import type {
  PlazoSimulador,
  SimularPlanPayload,
} from '@/features/ecommerce/types/catalogoPublico.types'
import { crearSimulacionPlanSchema } from '@/features/ecommerce/types/simulacionPlan.schema'
import type {
  SimulacionPlanFormOutput,
  SimulacionPlanFormValues,
} from '@/features/ecommerce/types/simulacionPlan.schema'
import { formatearPorcentaje } from '@/features/ecommerce/utils/formatearPorcentaje'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { SIMULADOR } from '../config/catalogo.config'
import { useSimularPlan } from '../hooks/useSimularPlan'
import { ResultadoSimulacion } from './ResultadoSimulacion'

interface SimuladorPlanProps {
  idUnidadFuncional: number
  /** Precio de lista de la unidad (su precio de contado): es el tope del anticipo en monto. */
  precioLista: number
  plazos: PlazoSimulador[]
}

/**
 * Simulación libre de un plan de pago (HU-25): el visitante elige un plazo y el
 * anticipo —en monto o en porcentaje— y ve el cronograma que calcula el
 * backend. Es público y de solo consulta, así que no pide sesión ni guarda nada.
 *
 * Al tocar cualquier campo se descarta el resultado anterior: si no, quedaría
 * en pantalla una simulación que ya no corresponde a lo que dice el formulario.
 */
export function SimuladorPlan({ idUnidadFuncional, precioLista, plazos }: SimuladorPlanProps) {
  const schema = useMemo(() => crearSimulacionPlanSchema(precioLista), [precioLista])
  const {
    mutate: simular,
    data: simulacion,
    isPending,
    error,
    reset: descartarResultado,
  } = useSimularPlan(idUnidadFuncional)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<SimulacionPlanFormValues, unknown, SimulacionPlanFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { plazo: '', modo: 'PORCENTAJE', anticipo: '' },
    mode: 'onChange',
  })

  const modo = watch('modo')

  const opcionesPlazo: SelectOption[] = useMemo(
    () =>
      [...plazos]
        .sort((a, b) => a.cantidad_cuotas - b.cantidad_cuotas)
        .map((plazo) => ({
          value: String(plazo.id_plazo_financiacion),
          label: SIMULADOR.opcionPlazo(
            plazo.cantidad_cuotas,
            formatearPorcentaje(plazo.tasa_nominal_anual)
          ),
        })),
    [plazos]
  )

  function alCambiar() {
    if (simulacion || error) descartarResultado()
  }

  function onSubmit({ plazo, modo, anticipo }: SimulacionPlanFormOutput) {
    if (isPending) return

    const payload: SimularPlanPayload =
      modo === 'PORCENTAJE'
        ? { FK_plazo_financiacion: plazo, anticipo_porcentaje: anticipo }
        : { FK_plazo_financiacion: plazo, anticipo_monto: anticipo }
    simular(payload)
  }

  return (
    <div className="border-light/15 bg-dark-deep flex flex-col gap-6 border p-6">
      <div>
        <span aria-hidden="true" className="bg-primary mb-5 block h-0.5 w-12" />
        <h3 className="text-light text-subtitulo flex items-center gap-3 font-bold">
          <Calculator size={20} aria-hidden="true" className="text-secondary shrink-0" />
          {SIMULADOR.titulo}
        </h3>
        <p className="text-light/70 mt-3 text-sm">{SIMULADOR.descripcion}</p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4 [&_label]:text-light [&_p]:text-light/60 [&_p[role='alert']]:text-error-soft"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={SIMULADOR.plazo}
            placeholder={SIMULADOR.plazoPlaceholder}
            options={opcionesPlazo}
            required
            disabled={isPending}
            error={errors.plazo?.message}
            {...register('plazo', { onChange: alCambiar })}
          />

          <Select
            label={SIMULADOR.modo}
            options={SIMULADOR.opcionesModo}
            disabled={isPending}
            {...register('modo', { onChange: alCambiar, deps: ['anticipo'] })}
          />
        </div>

        <Input
          label={SIMULADOR.anticipo}
          inputMode="decimal"
          autoComplete="off"
          required
          disabled={isPending}
          helperText={SIMULADOR.anticipoAyuda[modo]}
          error={errors.anticipo?.message}
          {...register('anticipo', { onChange: alCambiar })}
        />

        {error && (
          <div className="border-error bg-error/25 border px-4 py-3">
            <p role="alert" className="text-xs">
              {formatearMensajeError(error.message)}
            </p>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          icon={<Calculator />}
          loading={isPending}
          disabled={!isValid}
          className="self-start"
        >
          {SIMULADOR.simular}
        </Button>
      </form>

      {simulacion && <ResultadoSimulacion simulacion={simulacion} />}

      {/* Siempre visible, también antes de simular: es parte del simulador. */}
      <p className="border-light/15 text-light/70 flex gap-2 border p-4 text-sm">
        <Info size={16} aria-hidden="true" className="text-secondary mt-0.5 shrink-0" />
        {SIMULADOR.leyenda}
      </p>
    </div>
  )
}
