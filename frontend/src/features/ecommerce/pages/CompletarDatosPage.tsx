import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormSetError } from 'react-hook-form'
import { Check, Pencil, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { PATHS } from '@/app/router/paths'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { esArrayDeValidationIssues, formatearMensajeError } from '@/shared/utils/apiError'
import { PaginaCentrada } from '../components/PaginaCentrada'
import { TarjetaPublica } from '../components/TarjetaPublica'
import { useClienteAuthUser } from '../hooks/useClienteAuthUser'
import { useCompletarDatosCliente } from '../hooks/useCompletarDatosCliente'
import { completarDatosFormSchema } from '../types/cliente.schema'
import type { CompletarDatosFormOutput, CompletarDatosFormValues } from '../types/cliente.schema'
import { destinoOriginal } from '../utils/destinoOriginal'

const ID_FORM = 'form-completar-datos'

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
      nombre: cliente?.nombre ?? '',
      apellido: cliente?.apellido ?? '',
      dni_cuil: cliente?.dni_cuil ?? '',
      telefono: cliente?.telefono ?? '',
    },
    mode: 'onChange',
  })

  function enviar(datos: CompletarDatosFormOutput) {
    if (isPending) return

    setErrorGeneral(null)
    guardarDatos(datos, {
      onSuccess: () => {
        navigate(destinoOriginal(location.state, PATHS.ECOMMERCE.PERFIL), { replace: true })
      },
      onError: (error) => {
        setErrorGeneral(repartirErrorDelBackend(error, setError, setFocus))
      },
    })
  }

  function cancelar() {
    navigate(yaTeniaDatos ? PATHS.ECOMMERCE.PERFIL : PATHS.HOME)
  }

  return (
    <PaginaCentrada>
      <TarjetaPublica
        className="max-w-md"
        icon={<Pencil />}
        title={yaTeniaDatos ? 'Editar mis datos' : 'Completá tus datos'}
        footer={
          <>
            <Button variant="error" icon={<X />} onClick={cancelar} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              variant="success"
              icon={<Check />}
              type="submit"
              form={ID_FORM}
              loading={isPending}
              disabled={!isValid}
            >
              Guardar
            </Button>
          </>
        }
      >
        <p className="text-light/70 mb-6 text-sm">
          {yaTeniaDatos
            ? 'Actualizá tu nombre, tu DNI/CUIT y tu teléfono de contacto.'
            : 'Revisá tu nombre y completá tu DNI/CUIT y un teléfono de contacto para poder continuar.'}
        </p>

        {/*
          `Input` y `Field` son del panel interno: el label, el texto de ayuda
          y el mensaje de error vienen con los colores del fondo claro (el rojo
          `error` es ilegible sobre oscuro). Acá se los reescribe una sola vez
          para todo el formulario, en vez de tocar el componente compartido
          —que usan todas las pantallas internas— o repetirlo campo por campo.
          El control en sí queda igual que en el resto del sistema.
        */}
        <form
          id={ID_FORM}
          onSubmit={handleSubmit(enviar)}
          className="flex flex-col gap-5 [&_label]:text-light [&_p]:text-light/60 [&_p[role='alert']]:text-error-soft"
          noValidate
        >
          {errorGeneral && (
            <div className="border-error bg-error/25 border px-4 py-3">
              {/* El role va en el mensaje, que es lo que se anuncia. */}
              <p role="alert" className="text-xs">
                {errorGeneral}
              </p>
            </div>
          )}

          <Input
            label="Nombre"
            required
            autoComplete="given-name"
            maxLength={100}
            disabled={isPending}
            error={errors.nombre?.message}
            {...register('nombre')}
          />

          <Input
            label="Apellido"
            required
            autoComplete="family-name"
            maxLength={100}
            disabled={isPending}
            error={errors.apellido?.message}
            {...register('apellido')}
          />

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
            inputMode="numeric"
            autoComplete="tel"
            maxLength={30}
            placeholder="Ej. 3874123456"
            helperText="Solo números, sin espacios ni guiones."
            disabled={isPending}
            error={errors.telefono?.message}
            {...register('telefono')}
          />
        </form>
      </TarjetaPublica>
    </PaginaCentrada>
  )
}

/** Los campos del formulario, para saber qué issues del backend son de campo. */
const CAMPOS = ['nombre', 'apellido', 'dni_cuil', 'telefono'] as const
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
