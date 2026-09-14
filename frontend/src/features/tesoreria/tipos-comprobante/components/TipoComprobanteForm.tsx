import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormSetError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, FileText, Pencil, TriangleAlert, X } from 'lucide-react'
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { esArrayDeValidationIssues, formatearMensajeError } from '@/shared/utils/apiError'
import { tipoComprobanteFormSchema } from '../types/tipoComprobante.schema'
import type {
  TipoComprobanteFormOutput,
  TipoComprobanteFormValues,
} from '../types/tipoComprobante.schema'
import type { TipoComprobante } from '../types/tipoComprobante.types'

const ID_FORM = 'form-tipo-comprobante'

const OPCIONES_EFECTO_SALDO: SelectOption[] = [
  { value: 'true', label: 'Aumenta el saldo' },
  { value: 'false', label: 'Disminuye el saldo' },
]

interface TipoComprobanteFormProps {
  open: boolean
  onClose: () => void
  /** Sin este prop es alta; con un tipo de comprobante cargado, es edición. */
  tipoComprobante?: TipoComprobante
  onSubmit: (payload: TipoComprobanteFormOutput) => void
  loading?: boolean
  /**
   * Error del backend que la página decidió no resolver sola. Un 409 se pinta
   * sobre el campo Nombre, un 400 sobre los campos que indique, y el resto en
   * el banner de arriba del formulario.
   */
  error?: ApiErrorResponse | null
}

/**
 * Modal de crear/editar un tipo de comprobante.
 *
 * El efecto sobre el saldo se define en el alta y después queda bloqueado,
 * cualquiera sea su valor: cambiarlo reinterpretaría el signo de todos los
 * comprobantes ya registrados con ese tipo. En edición se muestra igual pero
 * deshabilitado, y lo único editable es nombre y descripción (el estado se
 * cambia desde el listado, con las acciones de baja y reactivación).
 */
export function TipoComprobanteForm({
  open,
  onClose,
  tipoComprobante,
  onSubmit,
  loading = false,
  error = null,
}: TipoComprobanteFormProps) {
  const esEdicion = tipoComprobante !== undefined
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isDirty, isValid },
  } = useForm<TipoComprobanteFormValues, unknown, TipoComprobanteFormOutput>({
    resolver: zodResolver(tipoComprobanteFormSchema),
    defaultValues: valoresIniciales(tipoComprobante),
    // Necesario para que "Guardar" sepa en todo momento si el form es válido.
    mode: 'onChange',
  })

  // Cada vez que se abre (alta nueva o edición de otro registro) el form
  // arranca limpio y el foco va al primer campo.
  useEffect(() => {
    if (!open) return

    reset(valoresIniciales(tipoComprobante))
    setErrorGeneral(null)
    setConfirmarDescarte(false)
    setFocus('nombre')
  }, [open, tipoComprobante, reset, setFocus])

  useEffect(() => {
    if (!error) return

    setErrorGeneral(repartirErrorDelBackend(error, setError, setFocus))
  }, [error, setError, setFocus])

  function enviar(payload: TipoComprobanteFormOutput) {
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
        title={esEdicion ? 'Editar tipo de comprobante' : 'Nuevo tipo de comprobante'}
        icon={esEdicion ? <Pencil /> : <FileText />}
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
            placeholder="Ej. Factura"
            disabled={loading}
            error={errors.nombre?.message}
            {...register('nombre')}
          />

          <Input
            label="Descripción"
            multiline
            placeholder="Texto breve para identificar el tipo de comprobante"
            disabled={loading}
            error={errors.descripcion?.message}
            {...register('descripcion')}
          />

          <Select
            label="Efecto sobre el saldo"
            required
            options={OPCIONES_EFECTO_SALDO}
            // En edición no hay opción vacía posible: el valor siempre viene
            // cargado, y el campo está deshabilitado.
            placeholder={esEdicion ? undefined : 'Seleccioná el efecto sobre el saldo'}
            // Cambiarlo después reinterpretaría el signo de todos los
            // comprobantes ya registrados con este tipo.
            disabled={esEdicion || loading}
            helperText={
              esEdicion
                ? 'El efecto sobre el saldo se definió al crear el tipo y no se puede modificar: cambiarlo reinterpretaría todos los comprobantes ya registrados.'
                : 'Una vez guardado no se va a poder modificar.'
            }
            error={errors.aumenta_saldo?.message}
            {...register('aumenta_saldo')}
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
const CAMPOS = ['nombre', 'descripcion', 'aumenta_saldo'] as const
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
  setError: UseFormSetError<TipoComprobanteFormValues>,
  setFocus: (campo: CampoDelFormulario) => void
): string | null {
  if (error.statusCode === 409) {
    setError('nombre', { message: 'Ya existe un tipo de comprobante activo con ese nombre.' })
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

function valoresIniciales(tipoComprobante?: TipoComprobante): TipoComprobanteFormValues {
  return {
    nombre: tipoComprobante?.nombre ?? '',
    descripcion: tipoComprobante?.descripcion ?? '',
    // Sin tipo de comprobante (alta) el select arranca en el placeholder.
    aumenta_saldo: tipoComprobante === undefined ? '' : String(tipoComprobante.aumenta_saldo),
  }
}
