import { httpClient } from '@/shared/api/httpClient'
import { useAbrirArchivoProtegido } from '@/shared/hooks/useAbrirArchivoProtegido'
import { rutaComprobanteDeclaracion } from '../services/declaracionesPago.service'

/**
 * Abre en una pestaña nueva el comprobante de una declaración de pago desde
 * el panel interno (T148), con el visor del navegador. El archivo se pide con
 * el token de la sesión: no hay URL pública.
 *
 * Cada botón usa su propia instancia, así tiene su propio `abriendo` y no
 * bloquea a los demás. `abrir` tiene que llamarse directamente desde el
 * handler del click (ver `abrirArchivoProtegido`).
 */
export function useAbrirComprobanteDeclaracion(idDeclaracionPago: number) {
  const { abrir, urlAbriendo } = useAbrirArchivoProtegido(httpClient, 'Cargando comprobante…')
  const ruta = rutaComprobanteDeclaracion(idDeclaracionPago)

  return {
    abrir: () => abrir(ruta),
    abriendo: urlAbriendo === ruta,
  }
}
