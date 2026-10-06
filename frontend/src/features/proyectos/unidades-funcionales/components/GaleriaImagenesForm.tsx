import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { ArrowLeft, ArrowRight, ImageOff, ImagePlus, Trash2 } from 'lucide-react'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { Button } from '@/shared/components/ui/Button'
import { IconButton } from '@/shared/components/ui/IconButton'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'
import {
  useAgregarImagenUnidadFuncional,
  useOrdenarImagenesUnidadFuncional,
  useQuitarImagenUnidadFuncional,
  useSubirImagen,
} from '../hooks/useUnidadesFuncionales'
import { validarArchivoDeImagen } from '../services/almacenamiento.service'
import type { ImagenUnidad } from '../types/unidadFuncional.types'

interface GaleriaImagenesFormProps {
  idUnidadFuncional: number
  identificador: string
  imagenes: ImagenUnidad[]
  soloLectura: boolean
}

/**
 * Galería editable de la unidad: agregar imágenes (valida tipo y tamaño antes
 * de subir, así un archivo inválido no deja el formulario en un estado raro),
 * reordenarlas con flechas y quitar una. Cada imagen se opera sola contra el
 * backend — no hay un guardado en lote, cada acción persiste al toque.
 *
 * En modo lectura se muestra la grilla sin ninguno de los controles.
 *
 * Requiere que la unidad YA exista (necesita `idUnidadFuncional`): en el alta,
 * la página no renderiza este componente hasta después de crear la cabecera.
 */
export function GaleriaImagenesForm({
  idUnidadFuncional,
  identificador,
  imagenes,
  soloLectura,
}: GaleriaImagenesFormProps) {
  const toast = useToast()
  const inputArchivoRef = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [imagenReordenandoId, setImagenReordenandoId] = useState<number | null>(null)
  const [imagenQuitandoId, setImagenQuitandoId] = useState<number | null>(null)

  const subirImagenMutation = useSubirImagen()
  const agregarImagen = useAgregarImagenUnidadFuncional()
  const ordenarImagenes = useOrdenarImagenesUnidadFuncional()
  const quitarImagen = useQuitarImagenUnidadFuncional()

  const imagenesOrdenadas = [...imagenes].sort((a, b) => a.orden - b.orden)

  async function manejarSeleccionArchivos(evento: ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(evento.target.files ?? [])
    evento.target.value = ''
    if (archivos.length === 0) return

    setSubiendo(true)
    let siguienteOrden = imagenesOrdenadas.length
    let huboError = false

    for (const archivo of archivos) {
      const errorValidacion = validarArchivoDeImagen(archivo)
      if (errorValidacion) {
        toast.error(errorValidacion)
        huboError = true
        continue
      }

      try {
        const { url } = await subirImagenMutation.mutateAsync(archivo)
        await agregarImagen.mutateAsync({ id: idUnidadFuncional, url, orden: siguienteOrden })
        siguienteOrden += 1
      } catch (error) {
        huboError = true
        toast.error(`${archivo.name}: ${formatearMensajeError((error as ApiErrorResponse).message)}`)
      }
    }

    setSubiendo(false)
    if (!huboError && archivos.length > 0) toast.success('Imágenes agregadas correctamente')
  }

  function moverImagen(desde: number, hacia: number) {
    if (hacia < 0 || hacia >= imagenesOrdenadas.length) return

    const nuevoOrden = [...imagenesOrdenadas]
    const [imagenMovida] = nuevoOrden.splice(desde, 1)
    nuevoOrden.splice(hacia, 0, imagenMovida)

    setImagenReordenandoId(imagenMovida.id_imagen_unidad)
    ordenarImagenes.mutate(
      { id: idUnidadFuncional, idsImagenUnidad: nuevoOrden.map((img) => img.id_imagen_unidad) },
      {
        onError: (error) => toast.error(formatearMensajeError(error.message)),
        onSettled: () => setImagenReordenandoId(null),
      }
    )
  }

  function quitar(idImagen: number) {
    setImagenQuitandoId(idImagen)
    quitarImagen.mutate(
      { id: idUnidadFuncional, idImagen },
      {
        onError: (error) => toast.error(formatearMensajeError(error.message)),
        onSettled: () => setImagenQuitandoId(null),
      }
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-content text-sm font-medium">Galería de imágenes</span>

        {!soloLectura && (
          <>
            <input
              ref={inputArchivoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              hidden
              onChange={manejarSeleccionArchivos}
            />
            <Button
              type="button"
              size="sm"
              variant="primary"
              icon={<ImagePlus />}
              loading={subiendo}
              onClick={() => inputArchivoRef.current?.click()}
            >
              Agregar imágenes
            </Button>
          </>
        )}
      </div>

      {imagenesOrdenadas.length === 0 ? (
        <EmptyState icono={ImageOff} titulo="Esta unidad no tiene imágenes" />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {imagenesOrdenadas.map((imagen, indice) => (
            <li key={imagen.id_imagen_unidad} className="flex flex-col gap-2">
              <TileImagen
                url={imagen.url}
                alt={`${identificador}, imagen ${indice + 1} de ${imagenesOrdenadas.length}`}
              />

              {!soloLectura && (
                <div className="flex items-center justify-center gap-1">
                  <IconButton
                    icon={<ArrowLeft />}
                    ariaLabel="Mover antes"
                    variant="soft"
                    size="sm"
                    disabled={indice === 0 || imagenReordenandoId !== null}
                    loading={imagenReordenandoId === imagen.id_imagen_unidad}
                    onClick={() => moverImagen(indice, indice - 1)}
                  />
                  <IconButton
                    icon={<Trash2 />}
                    ariaLabel="Quitar imagen"
                    variant="soft"
                    size="sm"
                    bgColor="fondo-eliminar"
                    iconColor="error"
                    disabled={imagenQuitandoId !== null}
                    loading={imagenQuitandoId === imagen.id_imagen_unidad}
                    onClick={() => quitar(imagen.id_imagen_unidad)}
                  />
                  <IconButton
                    icon={<ArrowRight />}
                    ariaLabel="Mover después"
                    variant="soft"
                    size="sm"
                    disabled={indice === imagenesOrdenadas.length - 1 || imagenReordenandoId !== null}
                    loading={imagenReordenandoId === imagen.id_imagen_unidad}
                    onClick={() => moverImagen(indice, indice + 1)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Mismo patrón que `GaleriaUnidad` (publicaciones): si la URL falla, un cuadro del mismo tamaño en vez de romper la grilla. */
function TileImagen({ url, alt }: { url: string; alt: string }) {
  const [fallo, setFallo] = useState(false)

  return (
    <div className="bg-surface-muted aspect-4/3 overflow-hidden rounded-md">
      {fallo ? (
        <div
          role="img"
          aria-label={`${alt} (no se pudo cargar)`}
          className="text-content-muted flex size-full flex-col items-center justify-center gap-1 p-2 text-center text-xs"
        >
          <ImageOff size={24} aria-hidden="true" />
          No se pudo cargar
        </div>
      ) : (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          onError={() => setFallo(true)}
          className="size-full object-cover"
        />
      )}
    </div>
  )
}
