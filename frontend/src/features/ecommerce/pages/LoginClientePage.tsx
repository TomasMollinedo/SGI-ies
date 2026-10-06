import { useState } from 'react'
import { User } from 'lucide-react'
import { Navigate, useLocation } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { Spinner } from '@/shared/components/ui/Spinner'
import { cn } from '@/shared/utils/cn'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { PaginaCentrada } from '../components/PaginaCentrada'
import { TarjetaPublica } from '../components/TarjetaPublica'
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
        <Spinner className="text-secondary size-8" />
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
      <TarjetaPublica className="max-w-sm" icon={<User />} title="Ingresar">
        <p className="text-light/70 mb-8 text-sm">
          Iniciá sesión con tu cuenta de Google para continuar.
        </p>

        <div className={cn(iniciandoSesion && 'pointer-events-none opacity-60')}>
          <GoogleSignInButton onCredential={handleCredential} onLoadError={setErrorGoogle} />
        </div>

        {iniciandoSesion ? (
          <p className="text-light/60 mt-4 text-center font-mono text-xs tracking-widest uppercase">
            Ingresando...
          </p>
        ) : null}

        {mensajeError ? (
          <div className="border-error bg-error/25 mt-6 border px-4 py-3">
            {/* El role va en el mensaje, que es lo que se anuncia. */}
            <p role="alert" className="text-error-soft text-xs">
              {mensajeError}
            </p>
          </div>
        ) : null}
      </TarjetaPublica>
    </PaginaCentrada>
  )
}
