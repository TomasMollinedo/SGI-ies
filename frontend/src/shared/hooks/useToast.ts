import { useContext } from 'react'
import { ToastContext, type ToastApi } from '@/shared/components/common/toastContext'

/**
 * Devuelve la API para disparar notificaciones desde cualquier componente:
 *
 * ```tsx
 * const toast = useToast()
 * toast.success('Artículo creado correctamente')
 * toast.error(mensajeDeError)
 * ```
 *
 * Los cuatro métodos reciben un string ya armado. El toast no sabe nada del
 * backend: traducir un error de la API a un mensaje legible es responsabilidad
 * de quien lo llama.
 *
 * Requiere que la app esté envuelta en `<ToastProvider>`.
 */
export function useToast(): ToastApi {
  const api = useContext(ToastContext)

  if (!api) {
    throw new Error('useToast() se usó fuera de un <ToastProvider>.')
  }

  return api
}
