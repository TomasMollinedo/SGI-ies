import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Toast } from '@/shared/components/common/Toast'
import {
  ToastContext,
  type ToastApi,
  type ToastItem,
  type ToastTipo,
} from '@/shared/components/common/toastContext'

/**
 * Cuánto dura la animación de salida antes de desmontar el toast.
 * Tiene que coincidir con `--animate-toast-out` en `theme.css`.
 */
const DURACION_SALIDA = 150

/**
 * Envuelve la app y maneja la cola de toasts. Renderiza la pila abajo a la
 * derecha, en un portal sobre `document.body`, para que ningún contenedor con
 * `overflow` o `transform` la recorte.
 *
 * Los componentes no lo usan directamente: disparan notificaciones con
 * `useToast()`.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const siguienteId = useRef(0)
  const temporizadores = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const pendientes = temporizadores.current
    return () => pendientes.forEach(clearTimeout)
  }, [])

  // Primero marca el toast como saliendo (para que corra la animación) y recién
  // después lo saca de la lista.
  const cerrar = useCallback((id: string) => {
    setToasts((anteriores) =>
      anteriores.map((toast) => (toast.id === id ? { ...toast, saliendo: true } : toast))
    )

    const temporizador = setTimeout(() => {
      setToasts((anteriores) => anteriores.filter((toast) => toast.id !== id))
    }, DURACION_SALIDA)

    temporizadores.current.push(temporizador)
  }, [])

  const api = useMemo<ToastApi>(() => {
    const agregar = (tipo: ToastTipo) => (mensaje: string) => {
      const id = `toast-${siguienteId.current}`
      siguienteId.current += 1
      setToasts((anteriores) => [...anteriores, { id, tipo, mensaje, saliendo: false }])
    }

    return {
      success: agregar('success'),
      error: agregar('error'),
      warning: agregar('warning'),
      info: agregar('info'),
    }
  }, [])

  return (
    <ToastContext value={api}>
      {children}

      {createPortal(
        // El contenedor es la región viva y está siempre montado: si el
        // `aria-live` naciera junto con el toast, varios lectores de pantalla no
        // llegarían a anunciarlo.
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2"
        >
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              id={toast.id}
              tipo={toast.tipo}
              mensaje={toast.mensaje}
              saliendo={toast.saliendo}
              onClose={cerrar}
            />
          ))}
        </div>,
        document.body
      )}
    </ToastContext>
  )
}
