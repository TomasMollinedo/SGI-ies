import { useEffect, useMemo, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Calculator, Printer } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { usePlazosFinanciacionCatalogo } from '@/features/comercializacion/plazos-financiacion/hooks/usePlazosFinanciacion'
import { crearSimulacionVentaSchema } from '../types/simulacionVenta.schema'
import type {
  SimulacionVentaFormOutput,
  SimulacionVentaFormValues,
} from '../types/simulacionVenta.schema'
import { usePlanesEjemploPublicacion, useSimularVenta } from '../hooks/useVentas'
import type { CondicionesVenta, SimulacionVenta } from '../types/venta.types'
import { ResultadoSimulacionVenta } from './ResultadoSimulacionVenta'

const OPCIONES_MODO: SelectOption[] = [
  { value: 'PORCENTAJE', label: 'Porcentaje (%)' },
  { value: 'MONTO', label: 'Monto ($)' },
]

interface SimulacionVentaPanelProps {
  FK_publicacion: number
  /** Precio de lista de la publicación (su precio de contado): tope del anticipo en monto. */
  precioLista: number
  /**
   * Avisa cada vez que hay (o deja de haber) una simulación válida y al día
   * con el formulario, para que quien arma la venta sepa qué mandar al
   * confirmar. `null` mientras no hay una simulación vigente (formulario
   * incompleto, inválido, o todavía recalculando).
   */
  onCambio: (
    resultado: { condiciones: CondicionesVenta; simulacion: SimulacionVenta } | null
  ) => void
}

/**
 * Simulador del plan de pago de la venta (HU-27): modalidad Contado o
 * Financiado, con precio de lista como precio de contado. En Financiado, el
 * plazo y el anticipo —en monto o en porcentaje— recalculan el cronograma al
 * instante (debounced). Sin plazos activos, solo se ofrece Contado.
 *
 * A diferencia del simulador del catálogo público (que espera un clic en
 * "Simular"), acá no hay botón: cualquier cambio válido dispara la
 * simulación sola, para que "cambiar el anticipo o el plazo recalcula todo
 * al instante" (criterio del ticket).
 */
export function SimulacionVentaPanel({
  FK_publicacion,
  precioLista,
  onCambio,
}: SimulacionVentaPanelProps) {
  const { data: plazosCatalogo, isPending: cargandoPlazos } = usePlazosFinanciacionCatalogo()
  const { data: planesEjemplo } = usePlanesEjemploPublicacion(FK_publicacion)
  const {
    mutate: simular,
    data: simulacion,
    isPending,
    error,
    reset: descartar,
  } = useSimularVenta()

  const hayPlazosActivos = (plazosCatalogo?.length ?? 0) > 0

  const schema = useMemo(() => crearSimulacionVentaSchema(precioLista), [precioLista])
  const {
    register,
    control,
    reset,
    formState: { errors },
  } = useForm<SimulacionVentaFormValues, unknown, SimulacionVentaFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { modalidad: 'CONTADO', plazo: '', modo: 'PORCENTAJE', anticipo: '' },
    mode: 'onChange',
  })

  // `useWatch` en vez de `watch()` en el render: solo emite un valor nuevo
  // cuando un campo realmente cambia, no en cada render del componente —
  // `watch()` arma un objeto nuevo siempre, así que con `useDebounce` nunca
  // se asentaba y la simulación se volvía a disparar en bucle.
  const valores = useWatch({ control })
  const modalidad = valores.modalidad
  const valoresDebounced = useDebounce(valores, 400)

  // Sin plazos activos no se puede financiar: si el usuario había elegido
  // Financiado y los plazos se quedaron sin ninguno activo, se fuerza Contado.
  useEffect(() => {
    if (!cargandoPlazos && !hayPlazosActivos && modalidad === 'FINANCIADO') {
      reset({ modalidad: 'CONTADO', plazo: '', modo: 'PORCENTAJE', anticipo: '' })
    }
  }, [cargandoPlazos, hayPlazosActivos, modalidad, reset])

  // Las condiciones con las que se pidió la simulación en curso: se leen en
  // vez de derivarlas de la respuesta, para no perder si el anticipo se
  // cargó en monto o en porcentaje (la respuesta trae los dos, ya calculados).
  const condicionesEnCurso = useRef<CondicionesVenta | null>(null)

  // Dispara la simulación sola con cada cambio válido (sin botón): es lo que
  // hace que "cambiar el anticipo o el plazo recalcule todo al instante".
  useEffect(() => {
    descartar()

    const parseado = schema.safeParse(valoresDebounced)
    if (!parseado.success) {
      condicionesEnCurso.current = null
      onCambio(null)
      return
    }

    const condiciones: CondicionesVenta =
      parseado.data.modalidad === 'CONTADO'
        ? { FK_publicacion, modalidad: 'CONTADO' }
        : {
            FK_publicacion,
            modalidad: 'FINANCIADO',
            FK_plazo_financiacion: parseado.data.plazo,
            ...(parseado.data.modo === 'PORCENTAJE'
              ? { anticipo_porcentaje: parseado.data.anticipo }
              : { anticipo_monto: parseado.data.anticipo }),
          }

    condicionesEnCurso.current = condiciones
    simular(condiciones)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `schema`, `simular`, `descartar` y `onCambio` son estables entre renders de este mismo formulario.
  }, [valoresDebounced, FK_publicacion])

  useEffect(() => {
    if (simulacion && condicionesEnCurso.current) {
      onCambio({ condiciones: condicionesEnCurso.current, simulacion })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cuando llega una simulación nueva.
  }, [simulacion])

  const opcionesPlazo: SelectOption[] = useMemo(
    () =>
      (plazosCatalogo ?? []).map((plazo) => ({
        value: plazo.id,
        label: `${plazo.code} · TNA ${plazo.metadata.tasa_nominal_anual} %`,
      })),
    [plazosCatalogo]
  )

  function precargarDesdePlan(idPlanEjemplo: string) {
    const plan = planesEjemplo?.find((p) => String(p.id_plan_ejemplo) === idPlanEjemplo)
    if (!plan) return

    reset({
      modalidad: 'FINANCIADO',
      plazo: String(plan.plazo.id_plazo_financiacion),
      modo: 'PORCENTAJE',
      anticipo: plan.anticipo_porcentaje.replace('.', ','),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {planesEjemplo && planesEjemplo.length > 0 && (
        <Select
          size="sm"
          label="Partir de un plan de ejemplo (opcional)"
          placeholder="Elegí un plan de ejemplo"
          options={planesEjemplo.map((p) => ({
            value: String(p.id_plan_ejemplo),
            label: `${p.nombre} — ${p.plazo.cantidad_cuotas} cuotas, anticipo ${p.anticipo_porcentaje} %`,
          }))}
          onChange={(evento) => precargarDesdePlan(evento.target.value)}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Modalidad"
          options={
            hayPlazosActivos
              ? [
                  { value: 'CONTADO', label: 'Contado' },
                  { value: 'FINANCIADO', label: 'Financiado' },
                ]
              : [{ value: 'CONTADO', label: 'Contado' }]
          }
          helperText={
            !cargandoPlazos && !hayPlazosActivos
              ? 'No hay plazos activos: solo Contado.'
              : undefined
          }
          {...register('modalidad')}
        />

        {modalidad === 'FINANCIADO' && (
          <Select
            label="Plazo"
            placeholder={cargandoPlazos ? 'Cargando plazos…' : 'Elegí un plazo'}
            options={opcionesPlazo}
            required
            disabled={cargandoPlazos}
            error={errors.plazo?.message}
            {...register('plazo')}
          />
        )}
      </div>

      {modalidad === 'FINANCIADO' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Anticipo en" options={OPCIONES_MODO} {...register('modo')} />
          <Input
            label="Anticipo"
            inputMode="decimal"
            autoComplete="off"
            required
            error={errors.anticipo?.message}
            {...register('anticipo')}
          />
        </div>
      )}

      {isPending && (
        <div className="flex items-center gap-2 py-2">
          <Spinner size={16} />
          <span className="text-content-muted text-xs">Calculando…</span>
        </div>
      )}

      {error && (
        <div className="border-error bg-error/10 border px-4 py-3 text-xs">
          {formatearMensajeError(error.message)}
        </div>
      )}

      {simulacion && (
        <>
          <ResultadoSimulacionVenta simulacion={simulacion} />
          <Button
            size="sm"
            variant="success"
            icon={<Printer />}
            className="self-start"
            onClick={() => window.print()}
          >
            Imprimir simulación
          </Button>
        </>
      )}

      <p className="border-subtle text-content-muted flex items-start gap-2 border p-3 text-xs">
        <Calculator size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        Simulación informativa y no vinculante. Los importes son estimativos: se calculan sobre el
        precio de lista y la tasa vigentes de cada plazo, y pueden cambiar. No genera una reserva ni
        una venta.
      </p>
    </div>
  )
}
