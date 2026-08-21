import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router'
import { PATHS } from '@/app/router/paths'
import type { ApiErrorResponse, ValidationIssue } from '@/shared/types/api.types'
import { useAuthUser } from '../hooks/useAuthUser'
import { useLogin } from '../hooks/useLogin'

function esArrayDeValidationIssues(message: unknown): message is ValidationIssue[] {
  return (
    Array.isArray(message) &&
    message.length > 0 &&
    typeof message[0] === 'object' &&
    message[0] !== null &&
    'campo' in message[0]
  )
}

function formatearMensajeError(message: ApiErrorResponse['message']): string {
  if (typeof message === 'string') {
    return message
  }
  if (esArrayDeValidationIssues(message)) {
    return message.map((issue) => `${issue.campo}: ${issue.error}`).join(', ')
  }
  if (Array.isArray(message)) {
    return message.join(', ')
  }
  return 'Ocurrió un error inesperado.'
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      <div className="bg-surface border-subtle w-full max-w-sm rounded-lg border p-8 shadow-sm">
        <h1 className="text-content mb-6 text-xl font-semibold">Iniciar sesión</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-content text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="border-subtle text-content focus:border-primary w-full rounded-md border px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-content text-sm font-medium">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="border-subtle text-content focus:border-primary w-full rounded-md border px-3 py-2 text-sm outline-none"
            />
          </div>
          {error ? (
            <p role="alert" className="text-danger text-sm">
              {formatearMensajeError(error.message)}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={iniciandoSesion}
            className="bg-primary text-primary-content hover:bg-primary-hover w-full rounded-md px-3 py-2 text-sm font-medium disabled:opacity-60"
          >
            {iniciandoSesion ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  )
}
