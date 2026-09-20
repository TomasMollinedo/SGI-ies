import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormSetError } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { PATHS } from '@/app/router/paths'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { esArrayDeValidationIssues, formatearMensajeError } from '@/shared/utils/apiError'
import { useClienteAuthUser } from '../hooks/useClienteAuthUser'
import { useCompletarDatosCliente } from '../hooks/useCompletarDatosCliente'
import { completarDatosFormSchema } from '../types/cliente.schema'
import type { CompletarDatosFormOutput, CompletarDatosFormValues } from '../types/cliente.schema'
import { destinoOriginal } from '../utils/destinoOriginal'

export function CompletarDatosPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { data: cliente } = useClienteAuthUser()
  const { mutate: guardarDatos, isPending } = useCompletarDatosCliente()
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  // Se fija al entrar: tras guardar, el PATCH actualiza la caché y `cliente`
  // pasaría a tener ambos datos, lo que cambiaría el título antes de navegar.
  const [yaTeniaDatos] = useState(() => cliente?.dni_cuil != null && cliente?.telefono != null)

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isValid },
  } = useForm<CompletarDatosFormValues, unknown, CompletarDatosFormOutput>({
    resolver: zodResolver(completarDatosFormSchema),
    defaultValues: {
      dni_cuil: cliente?.dni_cuil ?? '',
      telefono: cliente?.telefono ?? '',
    },
    mode: 'onChange',
  })

  function enviar({ dni_cuil, telefono }: CompletarDatosFormOutput) {
    if (isPending) return

    setErrorGeneral(null)
    guardarDatos(
      { dni_cuil, telefono },
      {
        onSuccess: () => {
          navigate(destinoOriginal(location.state, PATHS.ECOMMERCE.PERFIL), { replace: true })
        },
        onError: (error) => {
          setErrorGeneral(repartirErrorDelBackend(error, setError, setFocus))
        },
      }
    )
  }

  return (
    <div className="bg-surface-muted flex justify-center px-4 py-12 sm:py-16">
      <div className="bg-fondotabla h-fit w-full max-w-md rounded-2xl p-6 shadow-xl sm:p-10">
        <h1 className="text-titulo-modal text-content mb-1 text-center font-semibold">
          {yaTeniaDatos ? 'Editar mis datos' : 'Completá tus datos'}
        </h1>
        <p className="text-content-muted mb-8 text-center text-sm">
          {yaTeniaDatos
            ? 'Actualizá tu DNI/CUIT y tu teléfono de contacto.'
            : 'Necesitamos tu DNI/CUIT y un teléfono de contacto para poder continuar.'}
        </p>

        <form onSubmit={handleSubmit(enviar)} className="flex flex-col gap-4" noValidate>
          {errorGeneral && (
            <p role="alert" className="text-error bg-error/10 rounded-lg px-3 py-2 text-sm">
              {errorGeneral}
            </p>
          )}

          <Input
            label="DNI / CUIT"
            required
            inputMode="numeric"
            autoComplete="off"
            maxLength={11}
            placeholder="Ej. 30712345678"
            helperText="Sin puntos ni guiones."
            disabled={isPending}
            error={errors.dni_cuil?.message}
            {...register('dni_cuil')}
          />

          <Input
            label="Teléfono"
            required
            type="tel"
            autoComplete="tel"
            maxLength={30}
            placeholder="Ej. 3874123456"
            disabled={isPending}
            error={errors.telefono?.message}
            {...register('telefono')}
          />

          <Button type="submit" fullWidth loading={isPending} disabled={!isValid}>
            Guardar y continuar
          </Button>
        </form>
      </div>
    </div>
  )
}

/** Los campos del formulario, para saber qué issues del backend son de campo. */
const CAMPOS = ['dni_cuil', 'telefono'] as const
type CampoDelFormulario = (typeof CAMPOS)[number]

function esCampoDelFormulario(campo: string): campo is CampoDelFormulario {
  return CAMPOS.includes(campo as CampoDelFormulario)
}

/**
 * Manda cada error del backend a donde corresponda y devuelve lo que quedó sin
 * dueño, para el banner de arriba del formulario.
 */
function repartirErrorDelBackend(
  error: ApiErrorResponse,
  setError: UseFormSetError<CompletarDatosFormValues>,
  setFocus: (campo: CampoDelFormulario) => void
): string | null {
  if (error.statusCode === 409) {
    // Único conflicto posible en este endpoint hoy (el 409 no trae el campo
    // en el body): si el backend agrega otro campo único en PATCH
    // /cliente/me, este mapeo fijo deja de ser válido y hay que revisarlo.
    setError('dni_cuil', { message: formatearMensajeError(error.message) })
    setFocus('dni_cuil')
    return null
  }

  if (error.statusCode === 400 && esArrayDeValidationIssues(error.message)) {
    const issuesDeCampo = error.message.filter((issue) => esCampoDelFormulario(issue.campo))
    // Incluye los issues con `campo: ''` (ej. "hay que enviar al menos uno"),
    // que no pertenecen a ningún input y van al banner.
    const resto = error.message.filter((issue) => !esCampoDelFormulario(issue.campo))

    for (const issue of issuesDeCampo) {
      setError(issue.campo as CampoDelFormulario, { message: issue.error })
    }

    if (issuesDeCampo.length > 0) {
      setFocus(issuesDeCampo[0].campo as CampoDelFormulario)
    }

    return resto.length > 0
      ? resto
          .map((issue) => (issue.campo ? `${issue.campo}: ${issue.error}` : issue.error))
          .join(', ')
      : null
  }

  return formatearMensajeError(error.message)
}
