import type { AxiosInstance } from 'axios'
import type { ApiErrorResponse } from '@/shared/types/api.types'

/** `error` del `ApiErrorResponse` cuando el navegador no dejó abrir la pestaña. */
export const ERROR_VENTANA_BLOQUEADA = 'PopupBloqueado'

/**
 * Cuánto se espera antes de liberar la URL del archivo. No se puede revocar
 * apenas carga la pestaña: el visor de PDF del navegador vuelve a pedir la
 * misma URL al descargar, imprimir o recargar, y con la URL revocada eso
 * falla. Diez minutos cubren ese uso, y como estos archivos son chicos
 * (comprobantes de hasta 5 MB) tenerlos en memoria ese rato no cuesta nada.
 * Si la app se recarga antes, el navegador libera la URL solo.
 */
const MARGEN_REVOCAR_URL_MS = 10 * 60 * 1000

/**
 * Abre en una pestaña nueva un archivo que el backend solo entrega con el
 * token de la sesión (no hay URL pública): lo pide con `cliente`, arma una URL
 * local con el contenido y navega la pestaña ahí, así el navegador usa su
 * visor nativo tanto para un PDF como para una imagen.
 *
 * Tiene que llamarse directamente desde el handler de un click: la pestaña se
 * abre antes del primer `await`, porque si se abre después el navegador la
 * bloquea como ventana emergente.
 *
 * Si algo falla rechaza siempre con un `ApiErrorResponse`. Cuando el navegador
 * bloqueó la pestaña, `error` vale `ERROR_VENTANA_BLOQUEADA` y `message` ya
 * trae el texto para mostrar.
 */
export async function abrirArchivoProtegido(
  cliente: AxiosInstance,
  url: string,
  textoCargando = 'Cargando archivo…'
): Promise<void> {
  const pestana = window.open('', '_blank')
  if (!pestana) {
    throw crearError(
      0,
      'Tu navegador bloqueó la pestaña nueva. Permití las ventanas emergentes para este sitio y volvé a intentarlo.',
      ERROR_VENTANA_BLOQUEADA
    )
  }

  // La pestaña va a mostrar un archivo que subió un usuario: no tiene que
  // poder alcanzar a la app a través de `window.opener`.
  pestana.opener = null
  pestana.document.title = textoCargando
  pestana.document.body.textContent = textoCargando

  let respuesta
  try {
    respuesta = await cliente.get<Blob>(url, {
      responseType: 'blob',
      // Solo el 401 se deja rechazar, para que el interceptor de la sesión
      // renueve el token y reintente. El resto de los errores se resuelven
      // acá: el interceptor los convierte en el body (un `Blob`) y pierde el
      // código de estado, que hace falta si ese body no se puede leer.
      validateStatus: (status) => status !== 401,
    })
  } catch (error) {
    pestana.close()
    // Lo único que llega acá como `Blob` es un 401 que el refresh no arregló.
    throw await aApiError(error, 401)
  }

  if (respuesta.status < 200 || respuesta.status >= 300) {
    pestana.close()
    throw await aApiError(respuesta.data, respuesta.status)
  }

  // El `Blob` ya trae el tipo del `Content-Type` de la respuesta.
  const urlArchivo = URL.createObjectURL(respuesta.data)

  // El usuario pudo cerrar la pestaña mientras se pedía el archivo.
  if (pestana.closed) {
    URL.revokeObjectURL(urlArchivo)
    return
  }

  pestana.location.replace(urlArchivo)
  setTimeout(() => URL.revokeObjectURL(urlArchivo), MARGEN_REVOCAR_URL_MS)
}

/**
 * Con `responseType: 'blob'` el body de un error también llega como `Blob`:
 * se lee y se parsea. Si no es el JSON de error del backend (ej. una respuesta
 * de un proxy), se arma uno genérico que conserva el código de estado real.
 */
async function aApiError(dato: unknown, statusCode: number): Promise<ApiErrorResponse> {
  if (!(dato instanceof Blob)) {
    return esApiError(dato) ? dato : crearError(statusCode)
  }

  try {
    const cuerpo: unknown = JSON.parse(await dato.text())
    return esApiError(cuerpo) ? cuerpo : crearError(statusCode)
  } catch {
    return crearError(statusCode)
  }
}

function esApiError(dato: unknown): dato is ApiErrorResponse {
  return (
    typeof dato === 'object' &&
    dato !== null &&
    'statusCode' in dato &&
    typeof dato.statusCode === 'number'
  )
}

function crearError(
  statusCode: number,
  message = 'No se pudo abrir el archivo.',
  error = 'Error'
): ApiErrorResponse {
  return { statusCode, message, error, timestamp: new Date().toISOString(), path: '' }
}
