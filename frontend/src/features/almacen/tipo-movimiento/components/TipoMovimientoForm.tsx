import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormSetError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeftRight, Check, Pencil, TriangleAlert, X } from 'lucide-react'
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { esArrayDeValidationIssues, formatearMensajeError } from '@/shared/utils/apiError'
import { tipoMovimientoFormSchema } from '../types/tipoMovimiento.schema'
import type {
  TipoMovimientoFormOutput,
  TipoMovimientoFormValues,
} from '../types/tipoMovimiento.schema'
import type { TipoMovimiento } from '../types/tipoMovimiento.types'

const ID_FORM = 'form-tipo-movimiento'

const OPCIONES_INDICADOR: SelectOption[] = [
  { value: 'true', label: 'Entrada (suma stock)' },
  { value: 'false', label: 'Salida (resta stock)' },
]

interface TipoMovimientoFormProps {
  open: boolean
  onClose: () => void
  /** Sin este prop es alta; con un tipo de movimiento cargado, es edición. */
  tipoMovimiento?: TipoMovimiento
  onSubmit: (payload: TipoMovimientoFormOutput) => void
  loading?: boolean
  /**
   * Error del backend que la página decidió no resolver sola. Un 409 se pinta
   * sobre el campo Nombre, un 400 sobre los campos que indique, y el resto en
   * el banner de arriba del formulario.
   */
  error?: ApiErrorResponse | null
}

/**
 * Modal de crear/editar un tipo de movimiento.
 *
 * La diferencia entre los dos modos no es solo el título: el indicador de
 * entrada/salida se define en el alta y después queda bloqueado, así que en
 * edición se muestra igual pero deshabilitado.
 */
export function TipoMovimientoForm({
  open,
  onClose,
  tipoMovimiento,
  onSubmit,
  loading = false,
  error = null,
}: TipoMovimientoFormProps) {
  const esEdicion = tipoMovimiento !== undefined
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isDirty, isValid },
  } = useForm<TipoMovimientoFormValues, unknown, TipoMovimientoFormOutput>({
    resolver: zodResolver(tipoMovimientoFormSchema),
    defaultValues: valoresIniciales(tipoMovimiento),
    // Necesario para que "Guardar" sepa en todo momento si el form es válido.
    mode: 'onChange',
  })

  // Cada vez que se abre (alta nueva o edición de otro registro) el form
  // arranca limpio y el foco va al primer campo.
  useEffect(() => {
    if (!open) return

    reset(valoresIniciales(tipoMovimiento))
    setErrorGeneral(null)
    setConfirmarDescarte(false)
    setFocus('nombre')
  }, [open, tipoMovimiento, reset, setFocus])

  useEffect(() => {
    if (!error) return

    setErrorGeneral(repartirErrorDelBackend(error, setError, setFocus))
  }, [error, setError, setFocus])

  function enviar(payload: TipoMovimientoFormOutput) {
    if (loading) return

    setErrorGeneral(null)
    onSubmit(payload)
  }

  // Cerrar con datos a medio cargar pide confirmación; con un envío en curso no
  // se cierra directamente.
  function intentarCerrar() {
    if (loading) return

    if (isDirty) {
      setConfirmarDescarte(true)
      return
    }

    onClose()
  }

  const puedeGuardar = isValid && (!esEdicion || isDirty)

  return (
    <>
      <Modal
        open={open}
        onClose={intentarCerrar}
        title={esEdicion ? 'Editar tipo de movimiento' : 'Nuevo tipo de movimiento'}
        icon={esEdicion ? <Pencil /> : <ArrowLeftRight />}
        closeOnEscape={!loading && !confirmarDescarte}
        closeOnOverlayClick={!loading && !confirmarDescarte}
        footer={
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

          <Input
            label="Nombre"
            required
            placeholder="Ej. Compra a proveedor"
            disabled={loading}
            error={errors.nombre?.message}
            {...register('nombre')}
          />

          <Input
            label="Descripción"
            multiline
            placeholder="Texto breve para identificar el tipo de movimiento"
            disabled={loading}
            error={errors.descripcion?.message}
            {...register('descripcion')}
          />

          <Select
            label="Indicador"
            required
            options={OPCIONES_INDICADOR}
            // En edición no hay opción vacía posible: el valor siempre viene
            // cargado, y el campo está deshabilitado.
            placeholder={esEdicion ? undefined : 'Seleccioná entrada o salida'}
            // El signo del tipo de movimiento es lo que le da sentido a la
            // cantidad de cada movimiento histórico: se elige una vez y no se
            // vuelve a tocar.
            disabled={esEdicion || loading}
            helperText={
              esEdicion
                ? 'El indicador se definió al crear el tipo y no se puede modificar.'
                : 'Una vez guardado no se va a poder modificar.'
            }
            error={errors.indicador_entrada?.message}
            {...register('indicador_entrada')}
          />
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
const CAMPOS = ['nombre', 'descripcion', 'indicador_entrada'] as const
type CampoDelFormulario = (typeof CAMPOS)[number]

function esCampoDelFormulario(campo: string): campo is CampoDelFormulario {
  return CAMPOS.includes(campo as CampoDelFormulario)
}

/**
 * Manda cada error del backend a donde corresponda y devuelve lo que quedó sin
 * dueño, para el banner. El 409 es el caso importante: el modal no se cierra y
 * el mensaje aparece sobre el campo Nombre, con el foco puesto ahí.
 */
function repartirErrorDelBackend(
  error: ApiErrorResponse,
  setError: UseFormSetError<TipoMovimientoFormValues>,
  setFocus: (campo: CampoDelFormulario) => void
): string | null {
  if (error.statusCode === 409) {
    setError('nombre', { message: 'Ya existe un tipo de movimiento activo con ese nombre.' })
    setFocus('nombre')
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

function valoresIniciales(tipoMovimiento?: TipoMovimiento): TipoMovimientoFormValues {
  return {
    nombre: tipoMovimiento?.nombre ?? '',
    descripcion: tipoMovimiento?.descripcion ?? '',
    // Sin tipo de movimiento (alta) el select arranca en el placeholder.
    indicador_entrada: tipoMovimiento === undefined ? '' : String(tipoMovimiento.indicador_entrada),
  }
}
