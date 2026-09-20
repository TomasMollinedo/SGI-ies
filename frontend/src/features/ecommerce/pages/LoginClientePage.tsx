import { useState } from 'react'
import { User } from 'lucide-react'
import { Navigate, useLocation } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { cn } from '@/shared/utils/cn'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { PaginaCentrada } from '../components/PaginaCentrada'
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
      <PaginaCentrada>
        <Spinner size={32} />
      </PaginaCentrada>
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
    <PaginaCentrada>
      <div className="bg-fondotabla w-full max-w-sm rounded-2xl p-6 shadow-xl sm:p-10">
        <div className="bg-primary text-primary-content mx-auto mb-6 flex size-14 items-center justify-center rounded-full">
          <User size={28} />
        </div>
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
    </PaginaCentrada>
  )
}
