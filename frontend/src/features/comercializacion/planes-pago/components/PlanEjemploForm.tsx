import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormSetError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarClock, HandCoins, X } from 'lucide-react'
import { AlertaInline } from '@/features/comercializacion/publicaciones/components/AlertaInline'
import type { PlazoFinanciacion } from '@/features/comercializacion/plazos-financiacion/types/plazoFinanciacion.types'
import { formatearTasa } from '@/features/comercializacion/plazos-financiacion/utils/tasa'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { esArrayDeValidationIssues, formatearMensajeError } from '@/shared/utils/apiError'
import { formatearImporte } from '@/shared/utils/importe'
import { cn } from '@/shared/utils/cn'
import {
  useCrearPlanEjemplo,
  useEditarPlanEjemplo,
  useSimularPlanEjemplo,
} from '../hooks/usePlanesEjemplo'
import {
  VALORES_INICIALES,
  anticipoPorcentajeSchema,
  esCampoDelFormulario,
  planEjemploFormSchema,
} from '../types/planEjemplo.schema'
import type {
  CampoFormulario,
  PlanEjemploFormOutput,
  PlanEjemploFormValues,
} from '../types/planEjemplo.schema'
import type {
  PlanEjemplo,
  PlazoResumen,
  SimularPlanEjemploPayload,
} from '../types/planEjemplo.types'
import { limitarADosDecimalesEnVivo, normalizarSeparadorDecimal } from '../utils/decimal'
import { DesgloseImportes } from './DesgloseImportes'
import { SelectorPlazoModal } from './SelectorPlazoModal'

/** Espera desde la última tecla hasta pedir los importes al backend. */
const DEBOUNCE_SIMULACION = 400

interface PlanEjemploFormProps {
  onClose: () => void
  idPublicacion: number
  /** Precio de lista de la publicación, solo para el texto aclaratorio. `null` si no se pudo leer. */
  precioLista: number | null
  /** Plan a editar. `null` es un alta. */
  plan: PlanEjemplo | null
  onGuardado: () => void
}

/**
 * Alta y edición de un plan de pago de ejemplo (HU-22), en un modal.
 *
 * El plan se define con tres datos: nombre, anticipo (% del precio de lista) y
 * plazo de financiación, que se elige de la tabla de plazos activos. Mientras
 * se completan, los importes —anticipo, saldo a financiar, cuota, intereses y
 * total a pagar— se piden al backend (`POST /planes-ejemplo/simular`) y se
 * muestran tal cual llegan: acá no se calcula nada, para que el ejemplo
 * guardado, el del catálogo y esta previsualización den siempre los mismos
 * números.
 *
 * Todo es editable, nombre incluido: ninguna venta queda atada a un plan de
 * ejemplo. Si la publicación deja de estar Disponible, la pantalla ni abre
 * este formulario (ver `motivoPlanesBloqueados`); si pasa con el modal abierto,
 * el backend responde 409 y se muestra arriba.
 */
export function PlanEjemploForm({
  onClose,
  idPublicacion,
  precioLista,
  plan,
  onGuardado,
}: PlanEjemploFormProps) {
  const toast = useToast()
  const esEdicion = plan !== null
  const crear = useCrearPlanEjemplo()
  const editar = useEditarPlanEjemplo()

  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [plazo, setPlazo] = useState<PlazoResumen | null>(plan?.plazo ?? null)
  const [selectorAbierto, setSelectorAbierto] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isValid },
  } = useForm<PlanEjemploFormValues, unknown, PlanEjemploFormOutput>({
    resolver: zodResolver(planEjemploFormSchema),
    defaultValues: plan
      ? {
          nombre: plan.nombre,
          anticipo_porcentaje: normalizarSeparadorDecimal(plan.anticipo_porcentaje),
        }
      : VALORES_INICIALES,
    mode: 'onChange',
  })

  const anticipoTexto = watch('anticipo_porcentaje')
  const anticipoDebounced = useDebounce(anticipoTexto, DEBOUNCE_SIMULACION)
  const guardando = crear.isPending || editar.isPending

  // Solo se piden importes con condiciones completas y válidas: el mismo
  // schema que valida el campo decide si lo que se tipeó ya sirve.
  const anticipoValido = anticipoPorcentajeSchema.safeParse(anticipoDebounced)
  const payloadSimulacion: SimularPlanEjemploPayload | null =
    anticipoValido.success && plazo !== null
      ? {
          FK_publicacion: idPublicacion,
          anticipo_porcentaje: anticipoValido.data,
          FK_plazo_financiacion: plazo.id_plazo_financiacion,
        }
      : null

  const simulacion = useSimularPlanEjemplo(payloadSimulacion)
  // Lo que se ve puede ser del valor anterior mientras llega el nuevo (o
  // mientras el debounce espera): se atenúa para que no parezca vigente.
  const actualizando = simulacion.isFetching || anticipoTexto !== anticipoDebounced

  function alEscribirAnticipo(valor: string) {
    const limitado = limitarADosDecimalesEnVivo(valor)
    if (limitado !== valor) setValue('anticipo_porcentaje', limitado, { shouldValidate: true })
  }

  function elegirPlazo(elegido: PlazoFinanciacion) {
    setPlazo({
      id_plazo_financiacion: elegido.id_plazo_financiacion,
      codigo: elegido.codigo,
      cantidad_cuotas: elegido.cantidad_cuotas,
      tasa_nominal_anual: elegido.tasa_nominal_anual,
    })
    setSelectorAbierto(false)
  }

  function guardar(valores: PlanEjemploFormOutput) {
    if (plazo === null) return
    setErrorGeneral(null)

    const alFallar = (falla: ApiErrorResponse) =>
      setErrorGeneral(repartirErrorDelBackend(falla, setError))

    if (esEdicion) {
      editar.mutate(
        {
          id: plan.id_plan_ejemplo,
          payload: {
            nombre: valores.nombre,
            anticipo_porcentaje: valores.anticipo_porcentaje,
            FK_plazo_financiacion: plazo.id_plazo_financiacion,
          },
        },
        {
          onSuccess: (actualizado) => {
            toast.success(`Plan "${actualizado.nombre}" actualizado.`)
            onGuardado()
          },
          onError: alFallar,
        }
      )
      return
    }

    crear.mutate(
      {
        FK_publicacion: idPublicacion,
        nombre: valores.nombre,
        anticipo_porcentaje: valores.anticipo_porcentaje,
        FK_plazo_financiacion: plazo.id_plazo_financiacion,
      },
      {
        onSuccess: (creado) => {
          toast.success(`Plan "${creado.nombre}" creado.`)
          onGuardado()
        },
        onError: alFallar,
      }
    )
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={esEdicion ? 'Editar plan de ejemplo' : 'Nuevo plan de ejemplo'}
        icon={<HandCoins />}
        size="lg"
        closeOnEscape={!guardando}
        closeOnOverlayClick={!guardando}
        footer={
          <>
            <Button variant="error" icon={<X />} onClick={onClose} disabled={guardando}>
              Cancelar
            </Button>
            <Button
              variant="success"
              onClick={() => void handleSubmit(guardar)()}
              loading={guardando}
              disabled={guardando || !isValid || plazo === null}
            >
              {esEdicion ? 'Guardar cambios' : 'Crear plan'}
            </Button>
          </>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={(evento) => evento.preventDefault()}>
          {errorGeneral && <AlertaInline>{errorGeneral}</AlertaInline>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nombre del plan"
              required
              maxLength={100}
              placeholder="Ej. 30 % de anticipo en 12 cuotas"
              disabled={guardando}
              error={errors.nombre?.message}
              {...register('nombre')}
            />

            <Input
              label="Anticipo (%)"
              required
              type="text"
              inputMode="decimal"
              placeholder="Ej. 30"
              disabled={guardando}
              helperText="Porcentaje del precio de lista. Mayor a 0 y menor a 100."
              error={errors.anticipo_porcentaje?.message}
              {...register('anticipo_porcentaje', {
                onChange: (evento: React.ChangeEvent<HTMLInputElement>) =>
                  alEscribirAnticipo(evento.target.value),
              })}
            />
          </div>

          <div className="flex items-start gap-2">
            <Input
              label="Plazo de financiación"
              required
              readOnly
              value={plazo === null ? '' : textoPlazo(plazo)}
              placeholder="Elegí un plazo"
              helperText="Define la cantidad de cuotas mensuales y la TNA."
              className="min-w-0 flex-1"
            />
            <Button
              icon={<CalendarClock />}
              onClick={() => setSelectorAbierto(true)}
              disabled={guardando}
              className="mt-6"
            >
              {plazo === null ? 'Elegir plazo' : 'Cambiar plazo'}
            </Button>
          </div>

          <fieldset
            className="border-subtle flex flex-col gap-3 rounded-md border p-3"
            aria-busy={actualizando}
          >
            <legend className="text-content px-1 text-xs font-medium">Importes del plan</legend>

            <p className="text-content-muted text-xs">
              Se calculan con el precio de lista actual (
              {precioLista === null ? '—' : formatearImporte(precioLista)}) y la TNA del plazo
              elegido.
            </p>

            {payloadSimulacion === null ? (
              <p className="text-content-muted text-xs">
                Cargá un anticipo válido y elegí un plazo para ver los importes.
              </p>
            ) : simulacion.error ? (
              <AlertaInline>{formatearMensajeError(simulacion.error.message)}</AlertaInline>
            ) : simulacion.data ? (
              <div className={cn('transition-opacity', actualizando && 'opacity-50')}>
                <DesgloseImportes
                  importes={simulacion.data}
                  cantidadCuotas={simulacion.data.cantidad_cuotas}
                />
              </div>
            ) : (
              <p className="text-content-muted text-xs">Calculando…</p>
            )}
          </fieldset>
        </form>
      </Modal>

      {selectorAbierto && (
        <SelectorPlazoModal onClose={() => setSelectorAbierto(false)} onSeleccionar={elegirPlazo} />
      )}
    </>
  )
}

/** "PLZ-003 · 12 cuotas · TNA 24,00 %" */
function textoPlazo(plazo: PlazoResumen): string {
  return `${plazo.codigo} · ${plazo.cantidad_cuotas} cuota${plazo.cantidad_cuotas === 1 ? '' : 's'} · TNA ${formatearTasa(plazo.tasa_nominal_anual, 2)}`
}

/**
 * Manda cada issue del backend a su campo y devuelve lo que quedó sin dueño,
 * para el banner de arriba. Mismo criterio que `OrdenCompraForm`.
 */
function repartirErrorDelBackend(
  error: ApiErrorResponse,
  setError: UseFormSetError<PlanEjemploFormValues>
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
