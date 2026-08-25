import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormSetError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Pencil, Tag, TriangleAlert, X } from 'lucide-react'
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { esArrayDeValidationIssues, formatearMensajeError } from '@/shared/utils/apiError'
import { marcaFormSchema } from '../types/marca.schema'
import type { MarcaFormOutput, MarcaFormValues } from '../types/marca.schema'
import type { Marca } from '../types/marca.types'

const ID_FORM = 'form-marca'

interface MarcaFormProps {
  open: boolean
  onClose: () => void
  /** Sin este prop es alta; con una marca cargada, es edición. */
  marca?: Marca
  onSubmit: (payload: MarcaFormOutput) => void
  loading?: boolean
  /**
   * Error del backend que la página decidió no resolver sola. Un 409 se pinta
   * sobre el campo Nombre, un 400 sobre los campos que indique, y el resto en
   * el banner de arriba del formulario.
   */
  error?: ApiErrorResponse | null
}

/** Modal de crear/editar una marca. */
export function MarcaForm({
  open,
  onClose,
  marca,
  onSubmit,
  loading = false,
  error = null,
}: MarcaFormProps) {
  const esEdicion = marca !== undefined
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isDirty, isValid },
  } = useForm<MarcaFormValues, unknown, MarcaFormOutput>({
    resolver: zodResolver(marcaFormSchema),
    defaultValues: valoresIniciales(marca),
    // Necesario para que "Guardar" sepa en todo momento si el form es válido.
    mode: 'onChange',
  })

  // Cada vez que se abre (alta nueva o edición de otro registro) el form
  // arranca limpio y el foco va al primer campo.
  useEffect(() => {
    if (!open) return

    reset(valoresIniciales(marca))
    setErrorGeneral(null)
    setConfirmarDescarte(false)
    setFocus('nombre')
  }, [open, marca, reset, setFocus])

  useEffect(() => {
    if (!error) return

    setErrorGeneral(repartirErrorDelBackend(error, setError, setFocus))
  }, [error, setError, setFocus])

  function enviar(payload: MarcaFormOutput) {
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
        title={esEdicion ? 'Editar Marca' : 'Nueva Marca'}
        icon={esEdicion ? <Pencil /> : <Tag />}
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
            placeholder="Ej. Loma Negra"
            disabled={loading}
            error={errors.nombre?.message}
            {...register('nombre')}
          />

          <Input
            label="Descripción"
            multiline
            placeholder="Texto breve para identificar la marca"
            disabled={loading}
            error={errors.descripcion?.message}
            {...register('descripcion')}
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
const CAMPOS = ['nombre', 'descripcion'] as const
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
  setError: UseFormSetError<MarcaFormValues>,
  setFocus: (campo: CampoDelFormulario) => void
): string | null {
  if (error.statusCode === 409) {
    setError('nombre', { message: 'Ya existe una marca activa con ese nombre.' })
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

function valoresIniciales(marca?: Marca): MarcaFormValues {
  return {
    nombre: marca?.nombre ?? '',
    descripcion: marca?.descripcion ?? '',
  }
}
