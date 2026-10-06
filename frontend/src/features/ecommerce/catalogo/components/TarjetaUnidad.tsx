import { useState } from 'react'
import { ImageOff, MapPin } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { rutaDetalleUnidad } from '@/app/router/paths'
import type { UnidadCatalogo } from '@/features/ecommerce/types/catalogoPublico.types'
import { TIPOLOGIA_LABEL } from '@/shared/config/tipologiaUnidad.config'
import { textoCondicionEntrega } from '@/shared/utils/condicionEntrega'
import { formatearImporte } from '@/shared/utils/importe'
import { TARJETA } from '../config/catalogo.config'
import { formatearSuperficie } from '@/features/ecommerce/utils/formatearSuperficie'

interface TarjetaUnidadProps {
  unidad: UnidadCatalogo
}

/**
 * Una unidad del catálogo. Toda la tarjeta es el enlace a su detalle, con el
 * mismo lenguaje visual que las tarjetas de obras de la landing: bordes rectos,
 * línea terracota arriba y realce dorado al pasar por encima.
 */
export function TarjetaUnidad({ unidad }: TarjetaUnidadProps) {
  // Los filtros actuales viajan en el state para que el detalle pueda volver
  // exactamente a esta búsqueda.
  const { search } = useLocation()

  const superficies = [
    `${TARJETA.superficieCubierta} ${formatearSuperficie(unidad.superficie_cubierta)}`,
    unidad.superficie_descubierta !== null
      ? `${TARJETA.superficieDescubierta} ${formatearSuperficie(unidad.superficie_descubierta)}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Link
      to={rutaDetalleUnidad(unidad.id_unidad_funcional)}
      state={{ busqueda: search.startsWith('?') ? search.slice(1) : search }}
      className="group border-light/15 hover:border-secondary focus-visible:outline-light flex w-full flex-col border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span aria-hidden="true" className="bg-primary h-1 w-full" />

      <PortadaUnidad url={unidad.imagen_url} identificador={unidad.identificador} />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-light group-hover:text-secondary text-subtitulo font-bold transition-colors">
            {unidad.proyecto.nombre}
          </h3>
          <p className="text-light/60 mt-1 flex items-center gap-2 text-sm">
            <MapPin size={14} aria-hidden="true" className="text-primary shrink-0" />
            {unidad.proyecto.localidad}
          </p>
        </div>

        <p className="text-light/60 font-mono text-xs tracking-widest uppercase">
          {TIPOLOGIA_LABEL[unidad.tipologia]}
          {unidad.piso !== null && ` · ${TARJETA.piso} ${unidad.piso}`}
        </p>

        <p className="text-light/70 text-sm">{superficies}</p>

        <p className="text-light/70 text-sm">{textoCondicionEntrega(unidad.condicion_entrega)}</p>

        <p className="text-secondary mt-auto pt-2 text-lg font-bold">
          <span className="text-light/60 font-mono text-xs tracking-widest uppercase">
            {TARJETA.precioDesde}{' '}
          </span>
          {formatearImporte(unidad.precio_desde)}
        </p>
      </div>
    </Link>
  )
}

/** Relación de aspecto fija: la grilla no se desarma si las fotos vienen de distinto tamaño. */
function PortadaUnidad({ url, identificador }: { url: string | null; identificador: string }) {
  const [fallo, setFallo] = useState(false)

  if (url === null || fallo) {
    return (
      <div
        role="img"
        aria-label={TARJETA.sinImagen}
        className="bg-light/5 text-light/50 flex aspect-4/3 items-center justify-center"
      >
        <ImageOff size={32} aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="aspect-4/3 overflow-hidden">
      <img
        src={url}
        alt={`Unidad ${identificador}`}
        loading="lazy"
        onError={() => setFallo(true)}
        className="size-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
      />
    </div>
  )
}
