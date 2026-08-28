import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { useAuthUser } from '../hooks/useAuthUser'
import { useLogin } from '../hooks/useLogin'
import { User, Lock, Eye, EyeOff } from 'lucide-react'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const { data: usuario, isPending: verificandoSesion } = useAuthUser()
  const { mutate: iniciarSesion, isPending: iniciandoSesion, error } = useLogin()

  if (!verificandoSesion && usuario) {
    return <Navigate to={PATHS.HOME} replace />
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    iniciarSesion({ email, password })
  }

  return (
    <main className="bg-surface-muted flex min-h-screen items-center justify-center px-4">
      <div className="bg-fondotabla w-full max-w-sm rounded-2xl p-10 shadow-xl">
        <div className="bg-primary text-primary-content mx-auto mb-6 flex size-14 items-center justify-center rounded-full">
          <User size={28} />
        </div>
        <h1 className="text-titulo-modal text-content mb-1 text-center font-semibold">
          Iniciar sesión
        </h1>
        <p className="text-content-muted mb-8 text-center text-sm">
          Accedé con tu cuenta para continuar.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-content text-sm font-medium">
              Email
            </label>
            <div className="group border-subtle focus-within:border-primary bg-surface-muted flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 transition-colors">
              <User
                size={18}
                className="text-content-muted group-focus-within:text-primary shrink-0"
              />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="julieta@gmail.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="text-content placeholder:text-content-muted w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-content text-sm font-medium">
              Contraseña
            </label>
            <div className="group border-subtle focus-within:border-primary bg-surface-muted flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 transition-colors">
              <Lock
                size={18}
                className="text-content-muted group-focus-within:text-primary shrink-0"
              />
              <input
                id="password"
                name="password"
                type={mostrarPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="********"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="text-content placeholder:text-content-muted w-full bg-transparent text-sm outline-none [&::-ms-reveal]:hidden"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword((valor) => !valor)}
                aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="text-content-muted hover:text-content shrink-0"
              >
                {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-error bg-error/10 rounded-lg px-3 py-2 text-sm">
              {formatearMensajeError(error.message)}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={iniciandoSesion}
            className="bg-primary text-primary-content w-full rounded-xl py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {iniciandoSesion ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  )
}
