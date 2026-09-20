import { useEffect, useRef } from 'react'
import { env } from '@/config/env'
import { cargarScriptGoogleIdentity } from '../utils/googleIdentity'

interface GoogleSignInButtonProps {
  /** Recibe el id_token (JWT) que emite Google al elegir la cuenta. */
  onCredential: (idToken: string) => void
  /** Se llama si el script de Google no pudo cargarse (red caída, bloqueador). */
  onLoadError: (mensaje: string) => void
}

/**
 * Botón oficial de Google Identity Services. Es Google quien dibuja el botón
 * (y su texto, localizado en español): con GIS no se puede usar un botón
 * propio para obtener un id_token.
 */
export function GoogleSignInButton({ onCredential, onLoadError }: GoogleSignInButtonProps) {
  const contenedor = useRef<HTMLDivElement>(null)
  // Refs para que el efecto de abajo corra una sola vez aunque el padre
  // recree los callbacks en cada render (initialize no debe repetirse).
  const onCredentialRef = useRef(onCredential)
  const onLoadErrorRef = useRef(onLoadError)

  useEffect(() => {
    onCredentialRef.current = onCredential
    onLoadErrorRef.current = onLoadError
  })

  useEffect(() => {
    let cancelado = false

    cargarScriptGoogleIdentity()
      .then(() => {
        const elemento = contenedor.current
        if (cancelado || !elemento || !window.google) return

        window.google.accounts.id.initialize({
          client_id: env.googleClientId,
          callback: ({ credential }) => onCredentialRef.current(credential),
        })
        window.google.accounts.id.renderButton(elemento, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          locale: 'es',
          // GIS exige un ancho en px entre 200 y 400.
          width: Math.min(Math.max(elemento.clientWidth, 200), 400),
        })
      })
      .catch((error: Error) => {
        if (!cancelado) onLoadErrorRef.current(error.message)
      })

    return () => {
      cancelado = true
    }
  }, [])

  return <div ref={contenedor} className="flex min-h-11 w-full justify-center" />
}
