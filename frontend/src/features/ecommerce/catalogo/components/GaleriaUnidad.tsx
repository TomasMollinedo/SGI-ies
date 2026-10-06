import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import type { ImagenUnidad } from '@/features/ecommerce/types/catalogoPublico.types'
import { cn } from '@/shared/utils/cn'
import { DETALLE } from '../config/catalogo.config'

interface GaleriaUnidadProps {
  imagenes: ImagenUnidad[]
  identificador: string
}

/**
 * Galería del detalle: una imagen grande y las miniaturas debajo. Vive en esta
 * feature a propósito (el catálogo es la única pantalla que la usa); la galería
 * del panel interno es otra, con otra anatomía.
 *
 * Las miniaturas son botones de verdad: se recorren con Tab y se activan con
 * Enter o espacio, sin teclas propias que haya que adivinar. En pantallas
 * angostas la fila de miniaturas se desliza en horizontal.
 */
export function GaleriaUnidad({ imagenes, identificador }: GaleriaUnidadProps) {
  const [indiceActivo, setIndiceActivo] = useState(0)
  const [fallidas, setFallidas] = useState<Set<number>>(new Set())

  if (imagenes.length === 0) return <SinImagenes />

  const activa = imagenes[Math.min(indiceActivo, imagenes.length - 1)]
  const activaFallo = fallidas.has(indiceActivo)

  function marcarFallida(indice: number) {
    setFallidas((previas) => new Set(previas).add(indice))
  }

  return (
    <section aria-label={DETALLE.galeriaEtiqueta} className="flex flex-col gap-3">
      <div className="bg-light/5 aspect-4/3 overflow-hidden">
        {activaFallo ? (
          <SinImagenes />
        ) : (
          <img
            src={activa.url}
            alt={`${DETALLE.identificador} ${identificador}`}
            onError={() => marcarFallida(indiceActivo)}
            className="size-full object-cover"
          />
        )}
      </div>

      {imagenes.length > 1 && (
        <ul className="flex gap-3 overflow-x-auto pb-1">
          {imagenes.map((imagen, indice) => (
            <li key={imagen.url} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndiceActivo(indice)}
                aria-label={DETALLE.miniatura(indice + 1, imagenes.length)}
                aria-current={indice === indiceActivo ? 'true' : undefined}
                className={cn(
                  'focus-visible:outline-light block size-20 overflow-hidden border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
                  indice === indiceActivo
                    ? 'border-secondary'
                    : 'border-light/15 hover:border-light/40'
                )}
              >
                {fallidas.has(indice) ? (
                  <span className="bg-light/5 text-light/50 flex size-full items-center justify-center">
                    <ImageOff size={16} aria-hidden="true" />
                  </span>
                ) : (
                  <img
                    src={imagen.url}
                    alt=""
                    loading="lazy"
                    onError={() => marcarFallida(indice)}
                    className="size-full object-cover"
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function SinImagenes() {
  return (
    <div
      role="img"
      aria-label={DETALLE.sinImagenes}
      className="bg-light/5 text-light/60 flex aspect-4/3 size-full flex-col items-center justify-center gap-2"
    >
      <ImageOff size={40} aria-hidden="true" className="opacity-70" />
      <p className="text-xs">{DETALLE.sinImagenes}</p>
    </div>
  )
}
