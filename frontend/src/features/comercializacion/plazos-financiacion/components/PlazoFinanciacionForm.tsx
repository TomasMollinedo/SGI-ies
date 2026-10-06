import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { UseFormSetError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarClock, Check, Pencil, TriangleAlert, X } from 'lucide-react'
import { AuditInfo } from '@/shared/components/common/AuditInfo'
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog'
import { DetailRow } from '@/shared/components/common/DetailRow'
import { Modal } from '@/shared/components/common/Modal'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { esArrayDeValidationIssues, formatearMensajeError } from '@/shared/utils/apiError'
import { MAX_CANTIDAD_CUOTAS, SIN_DATO } from '../config/plazoFinanciacion.config'
import { usePlazoFinanciacionDetalle } from '../hooks/usePlazosFinanciacion'
import { plazoFinanciacionFormSchema } from '../types/plazoFinanciacion.schema'
import type {
  PlazoFinanciacionFormOutput,
  PlazoFinanciacionFormValues,
} from '../types/plazoFinanciacion.schema'
import type {
  ModoFormulario,
  PlazoFinanciacion,
  UsuarioResumen,
} from '../types/plazoFinanciacion.types'
import {
  DECIMALES_TASA_MENSUAL,
  aTnaNumero,
  calcularTasaMensual,
  formatearTasa,
  tnaATexto,
} from '../utils/tasa'

const ID_FORM = 'form-plazo-financiacion'

interface PlazoFinanciacionFormProps {
  open: boolean
  onClose: () => void
  /** INSERCIÓN y EDICIÓN dejan guardar; LECTURA muestra el plazo sin poder tocarlo. */
  modo: ModoFormulario
  /** El plazo a editar o consultar. En INSERCIÓN no se usa. */
  plazo?: PlazoFinanciacion
  onSubmit: (payload: PlazoFinanciacionFormOutput) => void
  /** En LECTURA, pasa a EDICIÓN con este mismo plazo. */
  onEditar: (plazo: PlazoFinanciacion) => void
  loading?: boolean
  /**
   * Error del backend que la página decidió no resolver sola. Un 409 (cantidad
   * de cuotas ya tomada) se pinta sobre ese campo, un 400 sobre los campos que
   * indique, y el resto en el banner de arriba del formulario.
   */
  error?: ApiErrorResponse | null
}

const TITULOS: Record<ModoFormulario, string> = {
  insercion: 'Nuevo plazo de financiación',
  edicion: 'Editar plazo de financiación',
  lectura: 'Detalle del plazo de financiación',
}

/**
 * Formulario paramétrico de plazos de financiación (HU-32): el mismo modal
 * opera en tres modos que decide quien lo abre.
 *
 * - INSERCIÓN: todos los campos editables.
 * - EDICIÓN: solo TNA y descripción. La cantidad de cuotas queda bloqueada
 *   desde el alta porque los planes de pago y de ejemplo ya cargados se
 *   identifican con ella: para ofrecer otro plazo se crea uno nuevo.
 * - LECTURA: todo bloqueado, con la auditoría (quién lo creó y modificó).
 *
 * La tasa mensual (TNA ÷ 12) se muestra en vivo en los tres modos, como dato
 * informativo no editable: es la que usa el cálculo de cuotas.
 */
export function PlazoFinanciacionForm({
  open,
  onClose,
  modo,
  plazo,
  onSubmit,
  onEditar,
  loading = false,
  error = null,
}: PlazoFinanciacionFormProps) {
  const toast = useToast()
  const esInsercion = modo === 'insercion'
  const esLectura = modo === 'lectura'
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    control,
    formState: { errors, isDirty, isValid },
  } = useForm<PlazoFinanciacionFormValues, unknown, PlazoFinanciacionFormOutput>({
    resolver: zodResolver(plazoFinanciacionFormSchema),
    defaultValues: valoresIniciales(plazo),
    // Necesario para que "Guardar" sepa en todo momento si el form es válido.
    mode: 'onChange',
  })

  // Cada vez que se abre (alta nueva o registro distinto) el form arranca
  // limpio y el foco va al primer campo que se puede tocar.
  useEffect(() => {
    if (!open) return

    reset(valoresIniciales(plazo))
    setErrorGeneral(null)
    setConfirmarDescarte(false)
    if (modo === 'insercion') setFocus('cantidad_cuotas')
    if (modo === 'edicion') setFocus('tasa_nominal_anual')
  }, [open, modo, plazo, reset, setFocus])

  useEffect(() => {
    if (!error) return

    setErrorGeneral(repartirErrorDelBackend(error, setError, setFocus))
  }, [error, setError, setFocus])

  // La tasa mensual se calcula con lo que hay escrito en el campo, sin esperar
  // al submit. Si la TNA todavía no es válida, no se muestra un número inventado.
  const tnaTipeada = useWatch({ control, name: 'tasa_nominal_anual' })
  const tna = aTnaNumero(tnaTipeada ?? '')
  const tasaMensual =
    tna === null ? SIN_DATO : formatearTasa(calcularTasaMensual(tna), DECIMALES_TASA_MENSUAL)

  // Los datos del formulario salen del plazo de la fila; el detalle solo se
  // pide en LECTURA, para la auditoría.
  const detalle = usePlazoFinanciacionDetalle(
    open && esLectura && plazo ? plazo.id_plazo_financiacion : null
  )
  const esInexistente = detalle.error?.statusCode === 404

  useEffect(() => {
    if (!esInexistente) return

    toast.error('El plazo de financiación ya no existe')
    onClose()
  }, [esInexistente, toast, onClose])

  function enviar(payload: PlazoFinanciacionFormOutput) {
    if (loading) return

    setErrorGeneral(null)
    onSubmit(payload)
  }

  // Cerrar con datos a medio cargar pide confirmación; con un envío en curso no
  // se cierra directamente.
  function intentarCerrar() {
    if (loading) return

    if (isDirty && !esLectura) {
      setConfirmarDescarte(true)
      return
    }

    onClose()
  }

  const puedeGuardar = isValid && (esInsercion || isDirty)
  const bloqueado = esLectura || loading

  return (
    <>
      <Modal
        open={open}
        onClose={intentarCerrar}
        title={TITULOS[modo]}
        icon={modo === 'edicion' ? <Pencil /> : <CalendarClock />}
        closeOnEscape={!loading && !confirmarDescarte}
        closeOnOverlayClick={!loading && !confirmarDescarte}
        footer={
          esLectura ? (
            <>
              <Button variant="error" icon={<X />} onClick={onClose}>
                Cerrar
              </Button>
              <Button
                variant="success"
                icon={<Pencil />}
                onClick={() => plazo && onEditar(plazo)}
                disabled={!plazo}
              >
                Editar registro
              </Button>
            </>
          ) : (
            <>
              <Button variant="error" icon={<X />} onClick={intentarCerrar} disabled={loading}>
                Cancelar
              </Button>
              <Button
                variant="success"
                icon={<Check />}
                type="submit"
                form={ID_FORM}
                loading={loading}
                disabled={!puedeGuardar}
              >
                Guardar
              </Button>
            </>
          )
        }
      >
        <form id={ID_FORM} onSubmit={handleSubmit(enviar)} className="flex flex-col gap-4">
          {errorGeneral && (
            <div
              role="alert"
              className="border-error/30 bg-error/10 flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3"
            >
              <p className="text-error text-xs">{errorGeneral}</p>
              <Button variant="error" size="sm" type="submit" form={ID_FORM} loading={loading}>
                Reintentar
              </Button>
            </div>
          )}

          {!esInsercion && (
            // El código lo genera el sistema: nunca se edita.
            <Input label="Código" readOnly value={plazo?.codigo ?? ''} />
          )}

          <Input
            label="Cantidad de cuotas"
            required={!esLectura}
            inputMode="numeric"
            placeholder={`Entre 1 y ${MAX_CANTIDAD_CUOTAS}`}
            // Solo se define en el alta: después queda bloqueada.
            disabled={!esInsercion || loading}
            helperText={
              esInsercion
                ? 'Todas las cuotas son mensuales, así que equivale al plazo en meses. Una vez guardado no se va a poder modificar: para ofrecer otro plazo, se crea uno nuevo.'
                : 'Se definió al crear el plazo y queda bloqueada de forma permanente: los planes de pago y de ejemplo ya cargados se identifican con ella.'
            }
            error={errors.cantidad_cuotas?.message}
            {...register('cantidad_cuotas')}
          />

          <Input
            label="Tasa nominal anual (TNA, %)"
            required={!esLectura}
            inputMode="decimal"
            placeholder="Ej. 18,50"
            disabled={bloqueado}
            error={errors.tasa_nominal_anual?.message}
            {...register('tasa_nominal_anual')}
          />

          <Input
            label="Tasa mensual (TNA ÷ 12)"
            readOnly
            value={tasaMensual}
            helperText="Dato informativo, no editable: es la tasa que usa el cálculo de cuotas."
          />

          <Input
            label="Descripción"
            multiline
            rows={3}
            placeholder="Ej. Promoción lanzamiento"
            disabled={bloqueado}
            error={errors.descripcion?.message}
            {...register('descripcion')}
          />

          {esLectura && plazo && (
            <>
              <DetailRow
                label="Estado"
                value={
                  <Badge variant={plazo.estado ? 'active' : 'inactive'}>
                    {plazo.estado ? 'Activo' : 'Inactivo'}
                  </Badge>
                }
              />

              {detalle.isPending ? (
                <div className="flex justify-center py-4">
                  <Spinner size={24} />
                </div>
              ) : detalle.error && !esInexistente ? (
                // El 404 no se muestra: el efecto de arriba avisa por toast y cierra.
                <ErrorState
                  mensaje={formatearMensajeError(detalle.error.message)}
                  onReintentar={() => detalle.refetch()}
                />
              ) : detalle.data ? (
                <AuditInfo
                  createdAt={detalle.data.hora_creacion}
                  createdBy={{ nombre: nombreCompleto(detalle.data.usuarioCreador) }}
                  // Un plazo que nunca se editó puede no tener fecha de
                  // modificación: sin estas dos props, `AuditInfo` no dibuja la
                  // columna.
                  updatedAt={detalle.data.hora_actualizacion ?? undefined}
                  updatedBy={
                    detalle.data.hora_actualizacion
                      ? { nombre: nombreCompleto(detalle.data.usuarioActualizador) }
                      : undefined
                  }
                />
              ) : null}
            </>
          )}
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
        title="¿Descartar los cambios?"
        note="Lo que cargaste en el formulario se va a perder."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
      />
    </>
  )
}

/** Los campos del formulario, para saber qué issues del backend son de campo. */
const CAMPOS = ['cantidad_cuotas', 'tasa_nominal_anual', 'descripcion'] as const
type CampoDelFormulario = (typeof CAMPOS)[number]

function esCampoDelFormulario(campo: string): campo is CampoDelFormulario {
  return CAMPOS.includes(campo as CampoDelFormulario)
}

/**
 * Manda cada error del backend a donde corresponda y devuelve lo que quedó sin
 * dueño, para el banner. El 409 es el caso importante: ya hay un plazo activo
 * con esa cantidad de cuotas, así que el modal no se cierra y el mensaje del
 * backend (que nombra al plazo que la tiene) aparece sobre ese campo.
 */
function repartirErrorDelBackend(
  error: ApiErrorResponse,
  setError: UseFormSetError<PlazoFinanciacionFormValues>,
  setFocus: (campo: CampoDelFormulario) => void
): string | null {
  if (error.statusCode === 409) {
    setError('cantidad_cuotas', { message: formatearMensajeError(error.message) })
    setFocus('cantidad_cuotas')
    return null
  }

  if (error.statusCode === 400 && esArrayDeValidationIssues(error.message)) {
    const issuesDeCampo = error.message.filter((issue) => esCampoDelFormulario(issue.campo))
    const resto = error.message.filter((issue) => !esCampoDelFormulario(issue.campo))

    for (const issue of issuesDeCampo) {
      setError(issue.campo as CampoDelFormulario, { message: issue.error })
    }

    if (issuesDeCampo.length > 0) {
      setFocus(issuesDeCampo[0].campo as CampoDelFormulario)
    }

    return resto.length > 0 ? formatearMensajeError(resto) : null
  }

  return formatearMensajeError(error.message)
}

function valoresIniciales(plazo?: PlazoFinanciacion): PlazoFinanciacionFormValues {
  return {
    cantidad_cuotas: plazo ? String(plazo.cantidad_cuotas) : '',
    tasa_nominal_anual: plazo ? tnaATexto(plazo.tasa_nominal_anual) : '',
    descripcion: plazo?.descripcion ?? '',
  }
}

function nombreCompleto(usuario: UsuarioResumen | null): string {
  if (!usuario) return SIN_DATO

  return `${usuario.nombre} ${usuario.apellido}`
}
