const URL_SCRIPT = 'https://accounts.google.com/gsi/client'

interface GoogleCredentialResponse {
  credential: string
}

interface GoogleButtonOptions {
  type?: 'standard'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  shape?: 'rectangular' | 'pill'
  width?: number
  locale?: string
}

// Solo lo que usa esta app de Google Identity Services (no hay paquete de
// tipos instalado).
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: GoogleCredentialResponse) => void
          }) => void
          renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void
        }
      }
    }
  }
}

let cargaDelScript: Promise<void> | null = null

/** Carga el script de Google Identity Services una sola vez, solo cuando hace falta. */
export function cargarScriptGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()

  cargaDelScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = URL_SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      script.remove()
      cargaDelScript = null
      reject(new Error('No se pudo cargar el inicio de sesión con Google. Revisá tu conexión.'))
    }
    document.head.appendChild(script)
  })

  return cargaDelScript
}
