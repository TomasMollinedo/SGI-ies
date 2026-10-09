import { useRef, useState } from 'react'
import type { AxiosInstance } from 'axios'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import {
  abrirArchivoProtegido,
  ERROR_VENTANA_BLOQUEADA,
} from '@/shared/utils/abrirArchivoProtegido'

/**
 * Abre un archivo protegido en una pestaña nueva (ver `abrirArchivoProtegido`)
 * y avisa con un toast si falla. Recibe la instancia de axios porque sirve
 * tanto para la sesión del cliente como para la del panel interno.
 *
 * `urlAbriendo` es la URL que se está pidiendo, o `null`: quien lo usa la
 * compara con la de su botón para mostrarle el loading solo a ese. Mientras un
 * archivo se está abriendo, `abrir` ignora otra llamada (un doble click no
 * abre dos pestañas). Para que varios botones no se bloqueen entre sí, cada
 * uno usa su propia instancia del hook.
 *
 * `abrir` tiene que llamarse directamente desde el handler del click.
 */
export function useAbrirArchivoProtegido(cliente: AxiosInstance, textoCargando?: string) {
  const toast = useToast()
  const [urlAbriendo, setUrlAbriendo] = useState<string | null>(null)
  // El estado se actualiza recién en el próximo render: el ref corta un
  // segundo click que llegue antes.
  const abriendo = useRef(false)

  async function abrir(url: string) {
    if (abriendo.current) return
    abriendo.current = true
    setUrlAbriendo(url)

    try {
      await abrirArchivoProtegido(cliente, url, textoCargando)
    } catch (error) {
      toast.error(mensajeDeError(error as ApiErrorResponse))
    } finally {
      abriendo.current = false
      setUrlAbriendo(null)
    }
  }

  return { abrir, urlAbriendo }
}

function mensajeDeError(error: ApiErrorResponse): string {
  if (error.error === ERROR_VENTANA_BLOQUEADA && typeof error.message === 'string') {
    return error.message
  }
  if (error.statusCode === 404) return 'No encontramos el archivo'
  return 'No pudimos abrir el archivo. Volvé a intentarlo en un momento.'
}
