import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import type { PublicacionDetalle } from '../types/publicacion.types'

interface GaleriaUnidadProps {
  identificador: string
  imagenes: PublicacionDetalle['imagenes']
}

/** Grilla simple de las imágenes de la unidad, en el orden en que llegan. */
export function GaleriaUnidad({ identificador, imagenes }: GaleriaUnidadProps) {
  if (imagenes.length === 0) {
    return <EmptyState icono={ImageOff} titulo="Esta unidad no tiene imágenes" />
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {imagenes.map((imagen, indice) => (
        <li key={imagen.id_imagen_unidad}>
          <ImagenUnidad
            url={imagen.url}
            alt={`${identificador}, imagen ${indice + 1} de ${imagenes.length}`}
          />
        </li>
      ))}
    </ul>
  )
}

/** Si la URL falla se reemplaza por un cuadro del mismo tamaño, para no romper la grilla. */
function ImagenUnidad({ url, alt }: { url: string; alt: string }) {
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
