import { COMPROBANTE } from '../config/misCompras.config'

/**
 * Mismos límites que valida el backend para el comprobante de una declaración
 * de pago (T147): no tiene sentido subir un archivo para que el servidor lo
 * rechace después.
 */
export const TAMANIO_MAXIMO_COMPROBANTE_BYTES = 5 * 1024 * 1024 // 5 MB
const TIPOS_COMPROBANTE = ['application/pdf', 'image/jpeg', 'image/png']
const EXTENSIONES_COMPROBANTE = ['.pdf', '.jpg', '.jpeg', '.png']

/** Valor del `accept` del input: tipos y extensiones, para que el selector filtre bien en todos los navegadores. */
export const ACCEPT_COMPROBANTE = [...TIPOS_COMPROBANTE, ...EXTENSIONES_COMPROBANTE].join(',')

/**
 * Valida el comprobante antes de mandarlo. Devuelve el mensaje de error, o
 * `null` si el archivo es válido.
 *
 * El tipo se decide por el MIME que informa el navegador y, si no informa
 * ninguno, por la extensión. Ninguno de los dos mira el contenido: un `.txt`
 * renombrado a `.pdf` pasa acá y lo rechaza el backend, que sí lo verifica.
 */
export function validarComprobante(archivo: File): string | null {
  if (archivo.size === 0) return COMPROBANTE.errorVacio

  const tipoPermitido = archivo.type
    ? TIPOS_COMPROBANTE.includes(archivo.type)
    : EXTENSIONES_COMPROBANTE.some((extension) => archivo.name.toLowerCase().endsWith(extension))
  if (!tipoPermitido) return COMPROBANTE.errorTipo

  // Exactamente 5 MB se acepta, igual que en el backend.
  if (archivo.size > TAMANIO_MAXIMO_COMPROBANTE_BYTES) return COMPROBANTE.errorTamanio

  return null
}

/** Tamaño de un archivo en la unidad que mejor se lee: "340 KB", "1,2 MB". */
export function formatearTamanioArchivo(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toLocaleString('es-AR', { maximumFractionDigits: 1 })} MB`
}
