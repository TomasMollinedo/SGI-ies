import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { cn } from '@/shared/utils/cn'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { useClienteAuthUser } from '../hooks/useClienteAuthUser'
import { useLoginCliente } from '../hooks/useLoginCliente'
import { destinoOriginal } from '../utils/destinoOriginal'

export function LoginClientePage() {
  const location = useLocation()
  const { data: cliente, isLoading: verificandoSesion } = useClienteAuthUser()
  const { mutate: iniciarSesion, isPending: iniciandoSesion, error } = useLoginCliente()
  const [errorGoogle, setErrorGoogle] = useState<string | null>(null)

  if (verificandoSesion) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={32} />
      </div>
    )
  }

  // Cubre los dos casos: alguien que ya tenía sesión y entra a /ingresar, y
  // el login recién hecho (useLoginCliente carga al cliente en la caché).
  if (cliente) {
    return <Navigate to={destinoOriginal(location.state, PATHS.HOME)} replace />
  }

  const mensajeError = error ? formatearMensajeError(error.message) : errorGoogle

  function handleCredential(idToken: string) {
    setErrorGoogle(null)
    iniciarSesion(idToken)
  }

  return (
    <div className="bg-surface-muted flex justify-center px-4 py-12 sm:py-16">
      <div className="bg-fondotabla h-fit w-full max-w-sm rounded-2xl p-6 shadow-xl sm:p-10">
        <h1 className="text-titulo-modal text-content mb-1 text-center font-semibold">Ingresar</h1>
        <p className="text-content-muted mb-8 text-center text-sm">
          Iniciá sesión con tu cuenta de Google para continuar.
        </p>

        <div className={cn(iniciandoSesion && 'pointer-events-none opacity-60')}>
          <GoogleSignInButton onCredential={handleCredential} onLoadError={setErrorGoogle} />
        </div>

        {iniciandoSesion ? (
          <p className="text-content-muted mt-4 text-center text-sm">Ingresando...</p>
        ) : null}

        {mensajeError ? (
          <p role="alert" className="text-error bg-error/10 mt-4 rounded-lg px-3 py-2 text-sm">
            {mensajeError}
          </p>
        ) : null}
      </div>
    </div>
  )
}
