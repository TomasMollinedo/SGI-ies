import { createContext } from 'react'

export type ToastTipo = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  tipo: ToastTipo
  mensaje: string
  /** Mientras es `true` el toast está corriendo la animación de salida. */
  saliendo: boolean
}

export interface ToastApi {
  success: (mensaje: string) => void
  error: (mensaje: string) => void
  warning: (mensaje: string) => void
  info: (mensaje: string) => void
}

/**
 * Contexto de los toasts. Vive en su propio archivo (y no dentro de
 * `ToastProvider.tsx`) porque un módulo que exporta un componente y otra cosa
 * más rompe el Fast Refresh de Vite.
 */
export const ToastContext = createContext<ToastApi | null>(null)
