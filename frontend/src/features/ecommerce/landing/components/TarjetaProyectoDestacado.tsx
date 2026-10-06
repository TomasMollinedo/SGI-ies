import { useState } from 'react'
import { ImageOff, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { rutaCatalogoPorProyecto } from '@/app/router/paths'
import type { ProyectoDestacado } from '@/features/ecommerce/types/catalogoPublico.types'
import { formatearImporte } from '@/shared/utils/importe'
import { OBRAS } from '@/features/ecommerce/config/sitioPublico.config'

interface TarjetaProyectoDestacadoProps {
  proyecto: ProyectoDestacado
}

/**
 * Un proyecto destacado. La tarjeta entera es el enlace al catálogo filtrado
 * por ese proyecto (`?FK_proyecto=`, el parámetro que acepta GET /catalogo).
 */
export function TarjetaProyectoDestacado({ proyecto }: TarjetaProyectoDestacadoProps) {
  return (
    <Link
      to={rutaCatalogoPorProyecto(proyecto.id_proyecto)}
      className="group border-light/15 hover:border-secondary focus-visible:outline-light flex w-full flex-col border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {/* Línea superior terracota: el detalle de color de la tarjeta. */}
      <span aria-hidden="true" className="bg-primary h-1 w-full" />

      <PortadaProyecto url={proyecto.imagen_portada_url} nombre={proyecto.nombre} />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-light group-hover:text-secondary text-subtitulo font-bold transition-colors">
          {proyecto.nombre}
        </h3>

        <p className="text-light/70 flex items-center gap-2 text-sm">
          <MapPin size={16} aria-hidden="true" className="text-primary shrink-0" />
          {proyecto.localidad}
        </p>

        <p className="text-light/60 font-mono text-xs tracking-widest uppercase">
          {OBRAS.unidadesDisponibles(proyecto.cantidad_disponibles)}
        </p>

        <p className="text-secondary mt-auto pt-2 text-lg font-bold">
          <span className="text-light/60 font-mono text-xs tracking-widest uppercase">
            {OBRAS.precioDesde}{' '}
          </span>
          {formatearImporte(proyecto.precio_desde)}
        </p>
      </div>
    </Link>
  )
}

/** Relación de aspecto fija para que la grilla no se desarme con imágenes de distinto tamaño. */
function PortadaProyecto({ url, nombre }: { url: string | null; nombre: string }) {
  const [fallo, setFallo] = useState(false)

  if (url === null || fallo) {
    return (
      <div
        role="img"
        aria-label={OBRAS.sinImagen}
        className="bg-light/5 text-light/40 flex aspect-4/3 items-center justify-center"
      >
        <ImageOff size={32} aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="aspect-4/3 overflow-hidden">
      <img
        src={url}
        alt={nombre}
        loading="lazy"
        onError={() => setFallo(true)}
        className="size-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
      />
    </div>
  )
}
