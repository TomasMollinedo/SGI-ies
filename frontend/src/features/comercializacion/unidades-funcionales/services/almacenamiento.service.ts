import { httpClient } from '@/shared/api/httpClient'

/**
 * Mismos límites que valida `AlmacenamientoController` en el backend (T97):
 * no tiene sentido subir un archivo para que el servidor lo rechace después.
 */
export const TAMANIO_MAXIMO_IMAGEN_BYTES = 5 * 1024 * 1024 // 5 MB
export const TIPOS_IMAGEN_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/** POST /almacenamiento/imagenes — sube un archivo al almacenamiento de objetos y devuelve su URL pública. */
export async function subirImagen(archivo: File): Promise<{ url: string }> {
  const formData = new FormData()
  formData.append('file', archivo)

  const { data } = await httpClient.post<{ url: string }>('/almacenamiento/imagenes', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return data
}

/**
 * Valida tipo y tamaño ANTES de mandar el archivo, para mostrar el error al
 * toque (sin esperar el roundtrip) y sin dejar el formulario en un estado raro.
 * Devuelve `null` si el archivo es válido.
 */
export function validarArchivoDeImagen(archivo: File): string | null {
  if (!TIPOS_IMAGEN_PERMITIDOS.includes(archivo.type)) {
    return `${archivo.name}: el archivo no es una imagen jpeg, png, webp o gif`
  }
  if (archivo.size > TAMANIO_MAXIMO_IMAGEN_BYTES) {
    return `${archivo.name}: la imagen supera los 5 MB`
  }
  return null
}
