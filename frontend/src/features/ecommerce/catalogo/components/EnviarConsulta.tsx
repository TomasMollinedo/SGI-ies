import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, LogIn, MessageSquare, Send } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { MAX_LARGO_CONSULTA } from '@/features/ecommerce/config/consulta.config'
import { useEnviarConsulta } from '@/features/ecommerce/hooks/useConsultas'
import { useClienteAuthUser } from '@/features/ecommerce/hooks/useClienteAuthUser'
import { enviarConsultaFormSchema } from '@/features/ecommerce/types/consulta.schema'
import type {
  EnviarConsultaFormOutput,
  EnviarConsultaFormValues,
} from '@/features/ecommerce/types/consulta.schema'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Spinner } from '@/shared/components/ui/Spinner'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { CONSULTA } from '../config/catalogo.config'

const ID_FORM = 'form-enviar-consulta'

interface EnviarConsultaProps {
  /** Unidad sobre la que se consulta. */
  idUnidadFuncional: number
}

/**
 * Envío de consulta sobre una unidad (HU-26 / T119). Requiere sesión de
 * cliente iniciada — a diferencia del resto del catálogo, que es libre.
 *
 * Sin sesión, el CTA manda al login pasando `state: { from: location }` —
 * el mismo mecanismo que ya usa `ClienteProtectedRoute` — así que al volver
 * a loguearse, `destinoOriginal` + `LoginClientePage` traen de vuelta a esta
 * misma unidad sin que este componente sepa nada de cómo se resuelve eso.
 *
 * No hay restricción de unicidad: después de enviar, el formulario se
 * limpia y queda disponible para mandar otra consulta sobre la misma unidad
 * (no se deshabilita el botón "para siempre" tras el primer envío).
 */
export function EnviarConsulta({ idUnidadFuncional }: EnviarConsultaProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { data: cliente, isLoading: verificandoSesion } = useClienteAuthUser()
  const {
    mutate: enviar,
    isPending,
    error,
    reset: resetEnvio,
  } = useEnviarConsulta()
  const [enviada, setEnviada] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<EnviarConsultaFormValues, unknown, EnviarConsultaFormOutput>({
    resolver: zodResolver(enviarConsultaFormSchema),
    defaultValues: { texto: '' },
    mode: 'onChange',
  })

  const longitudActual = watch('texto')?.length ?? 0

  function onSubmit(payload: EnviarConsultaFormOutput) {
    if (isPending) return

    setEnviada(false)
    enviar(
      { FK_unidad_funcional: idUnidadFuncional, texto: payload.texto },
      {
        onSuccess: () => {
          reset()
          setEnviada(true)
        },
      }
    )
  }

  return (
    <section aria-labelledby="titulo-consulta" className="border-light/15 bg-dark-deep border p-6">
      <span aria-hidden="true" className="bg-primary mb-5 block h-0.5 w-12" />

      <h2 id="titulo-consulta" className="text-light flex items-center gap-3 text-subtitulo font-bold">
        <MessageSquare size={20} aria-hidden="true" className="text-secondary shrink-0" />
        {CONSULTA.titulo}
      </h2>

      <p className="text-light/70 mt-3 text-sm">{CONSULTA.descripcion}</p>

      {verificandoSesion ? (
        <div className="mt-6 flex justify-center">
          <Spinner className="text-secondary size-6" />
        </div>
      ) : !cliente ? (
        <Button
          variant="primary"
          icon={<LogIn />}
          className="mt-6"
          onClick={() => navigate(PATHS.ECOMMERCE.LOGIN, { state: { from: location } })}
        >
          {CONSULTA.loginBoton}
        </Button>
      ) : (
        <form
          id={ID_FORM}
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 flex flex-col gap-3 [&_label]:text-light [&_p]:text-light/60 [&_p[role='alert']]:text-error-soft"
          noValidate
        >
          {error && (
            <div className="border-error bg-error/25 border px-4 py-3">
              <p role="alert" className="text-xs">
                {formatearMensajeError(error.message)}
              </p>
            </div>
          )}

          {enviada && (
            <div className="border-success bg-success/25 flex items-center gap-2 border px-4 py-3">
              <CheckCircle2 size={16} aria-hidden="true" className="text-success shrink-0" />
              <p className="text-xs">{CONSULTA.exito}</p>
            </div>
          )}

          <Input
            label={CONSULTA.campoLabel}
            multiline
            rows={4}
            required
            placeholder={CONSULTA.campoPlaceholder}
            maxLength={MAX_LARGO_CONSULTA}
            disabled={isPending}
            error={errors.texto?.message}
            {...register('texto', {
              onChange: () => {
                if (enviada) setEnviada(false)
                if (error) resetEnvio()
              },
            })}
          />

          <div className="flex items-center justify-between gap-3">
            <p aria-live="polite" className="text-xs">
              {longitudActual} / {MAX_LARGO_CONSULTA}
            </p>
            <Button type="submit" variant="success" icon={<Send />} loading={isPending} disabled={!isValid}>
              {CONSULTA.enviar}
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}