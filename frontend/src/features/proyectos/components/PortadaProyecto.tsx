import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { ImageOff, ImagePlus, Trash2 } from 'lucide-react'
import { useSubirImagen } from '@/features/proyectos/hooks/useSubirImagen'
import { validarArchivoDeImagen } from '@/features/proyectos/services/almacenamiento.service'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'

interface PortadaProyectoProps {
  /** URL de la portada, o `''` si el proyecto no tiene. */
  url: string
  onChange: (url: string) => void
  soloLectura: boolean
  /** Avisa mientras hay una subida en curso, para no guardar el formulario a medias. */
  onSubiendoChange?: (subiendo: boolean) => void
}

/**
 * Imagen de portada del proyecto: subir, previsualizar, reemplazar y quitar.
 *
 * A diferencia de la galería de diseño, acá nada se persiste al toque: el
 * archivo se sube al almacenamiento (valida tipo y tamaño ANTES de subir) y la
 * URL queda en el formulario; recién se guarda en el proyecto con "Guardar".
 * Por eso funciona también en el alta, cuando el proyecto todavía no existe.
 */
export function PortadaProyecto({
  url,
  onChange,
  soloLectura,
  onSubiendoChange,
}: PortadaProyectoProps) {
  const toast = useToast()
  const inputArchivoRef = useRef<HTMLInputElement>(null)
  const subirImagen = useSubirImagen()
  const subiendo = subirImagen.isPending

  useEffect(() => {
    onSubiendoChange?.(subiendo)
  }, [subiendo, onSubiendoChange])

  function manejarSeleccionArchivo(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!archivo) return

    const errorValidacion = validarArchivoDeImagen(archivo)
    if (errorValidacion) {
      toast.error(errorValidacion)
      return
    }

    subirImagen.mutate(archivo, {
      onSuccess: ({ url: urlSubida }) => onChange(urlSubida),
      onError: (error) => toast.error(`${archivo.name}: ${formatearMensajeError(error.message)}`),
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {url ? (
        // La `key` reinicia el estado de "no se pudo cargar" al cambiar de imagen.
        <VistaPreviaPortada key={url} url={url} />
      ) : (
        <div className="bg-surface-muted text-content-muted flex aspect-video flex-col items-center justify-center gap-1 rounded-md text-xs">
          <ImageOff size={24} aria-hidden="true" />
          Sin imagen de portada
        </div>
      )}

      {!soloLectura && (
        <>
          <input
            ref={inputArchivoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={manejarSeleccionArchivo}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="primary"
              icon={<ImagePlus />}
              loading={subiendo}
              onClick={() => inputArchivoRef.current?.click()}
            >
              {url ? 'Reemplazar portada' : 'Subir portada'}
            </Button>
            {url && (
              <Button
                type="button"
                size="sm"
                variant="error"
                icon={<Trash2 />}
                disabled={subiendo}
                onClick={() => onChange('')}
              >
                Quitar portada
              </Button>
            )}
          </div>
          <p className="text-content-muted text-xs">
            Opcional. Imagen jpeg, png, webp o gif de hasta 5 MB. El cambio se aplica al guardar el
            proyecto.
          </p>
        </>
      )}
    </div>
  )
}

function VistaPreviaPortada({ url }: { url: string }) {
  const [fallo, setFallo] = useState(false)

  return (
    <div className="bg-surface-muted aspect-video overflow-hidden rounded-md">
      {fallo ? (
        <div
          role="img"
          aria-label="Imagen de portada (no se pudo cargar)"
          className="text-content-muted flex size-full flex-col items-center justify-center gap-1 text-xs"
        >
          <ImageOff size={24} aria-hidden="true" />
          No se pudo cargar
        </div>
      ) : (
        <img
          src={url}
          alt="Imagen de portada del proyecto"
          onError={() => setFallo(true)}
          className="size-full object-cover"
        />
      )}
    </div>
  )
}
