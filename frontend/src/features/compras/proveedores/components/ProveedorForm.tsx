import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormSetError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, TriangleAlert, Truck, X } from 'lucide-react'
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { esArrayDeValidationIssues, formatearMensajeError } from '@/shared/utils/apiError'
import { useCondicionesIva } from '../hooks/useProveedores'
import { proveedorFormSchema } from '../types/proveedor.schema'
import type { ProveedorFormOutput, ProveedorFormValues } from '../types/proveedor.schema'

const ID_FORM = 'form-proveedor'

interface ProveedorFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: ProveedorFormOutput) => void
  loading?: boolean
  /**
   * Error del backend que la página decidió no resolver sola. Un 400 se pinta
   * sobre los campos que indique, y el resto en el banner de arriba del
   * formulario.
   */
  error?: ApiErrorResponse | null
}

const VALORES_INICIALES: ProveedorFormValues = {
  razon_social: '',
  cuit: '',
  condicion_iva: '',
  domicilio: '',
  telefono: '',
  correo: '',
  observaciones: '',
}

/** Modal de alta de un proveedor. */
export function ProveedorForm({
  open,
  onClose,
  onSubmit,
  loading = false,
  error = null,
}: ProveedorFormProps) {
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const { data: condicionesIva } = useCondicionesIva()
  const opcionesCondicionIva: SelectOption[] =
    condicionesIva?.map((item) => ({ value: item.id, label: item.code })) ?? []

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isDirty, isValid },
  } = useForm<ProveedorFormValues, unknown, ProveedorFormOutput>({
    resolver: zodResolver(proveedorFormSchema),
    defaultValues: VALORES_INICIALES,
    // Necesario para que "Guardar" sepa en todo momento si el form es válido.
    mode: 'onChange',
  })

  // Cada vez que se abre, el form arranca limpio y el foco va al primer campo.
  useEffect(() => {
    if (!open) return

    reset(VALORES_INICIALES)
    setErrorGeneral(null)
    setConfirmarDescarte(false)
    setFocus('razon_social')
  }, [open, reset, setFocus])

  useEffect(() => {
    if (!error) return

    setErrorGeneral(repartirErrorDelBackend(error, setError, setFocus))
  }, [error, setError, setFocus])

  function enviar(payload: ProveedorFormOutput) {
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

  return (
    <>
      <Modal
        open={open}
        onClose={intentarCerrar}
        title="Nuevo Proveedor"
        icon={<Truck />}
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
              disabled={!isValid}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Razón Social"
              required
              placeholder="Ej. Farmacia Bermejo S.A."
              disabled={loading}
              error={errors.razon_social?.message}
              {...register('razon_social')}
            />

            <Input
              label="CUIT"
              required
              placeholder="Ej. 30-12345678-9"
              disabled={loading}
              error={errors.cuit?.message}
              {...register('cuit')}
            />

            <Select
              label="Condición frente al IVA"
              required
              placeholder="Seleccioná una condición"
              options={opcionesCondicionIva}
              disabled={loading}
              error={errors.condicion_iva?.message}
              {...register('condicion_iva')}
            />

            <Input
              label="Teléfono"
              placeholder="Ej. 011 4444-5555"
              disabled={loading}
              error={errors.telefono?.message}
              {...register('telefono')}
            />

            <Input
              label="Correo"
              type="email"
              placeholder="Ej. contacto@proveedor.com"
              disabled={loading}
              error={errors.correo?.message}
              {...register('correo')}
            />

            <Input
              label="Domicilio"
              placeholder="Ej. Av. Siempreviva 742"
              disabled={loading}
              error={errors.domicilio?.message}
              {...register('domicilio')}
            />
          </div>

          <Input
            label="Observaciones"
            multiline
            placeholder="Texto breve para identificar al proveedor"
            disabled={loading}
            error={errors.observaciones?.message}
            {...register('observaciones')}
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
const CAMPOS = [
  'razon_social',
  'cuit',
  'condicion_iva',
  'domicilio',
  'telefono',
  'correo',
  'observaciones',
] as const
type CampoDelFormulario = (typeof CAMPOS)[number]

function esCampoDelFormulario(campo: string): campo is CampoDelFormulario {
  return CAMPOS.includes(campo as CampoDelFormulario)
}

/**
 * Manda cada error del backend a donde corresponda y devuelve lo que quedó sin
 * dueño, para el banner.
 */
function repartirErrorDelBackend(
  error: ApiErrorResponse,
  setError: UseFormSetError<ProveedorFormValues>,
  setFocus: (campo: CampoDelFormulario) => void
): string | null {
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
