import { useState } from 'react'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import { TIPO_IMAGEN_PROYECTO_LABEL } from '../config/proyecto.config'
import {
  useAgregarImagenProyecto,
  useOrdenarImagenesProyecto,
  useQuitarImagenProyecto,
} from '../hooks/useProyectos'
import type { ProyectoDetalle, TipoImagenProyecto } from '../types/proyecto.types'
import { GaleriaImagenes } from './GaleriaImagenes'

const OPCIONES_TIPO: SelectOption[] = (
  Object.entries(TIPO_IMAGEN_PROYECTO_LABEL) as [TipoImagenProyecto, string][]
).map(([value, label]) => ({ value, label }))

interface GaleriaDisenoProyectoProps {
  proyecto: Pick<ProyectoDetalle, 'id_proyecto' | 'nombre' | 'imagenes'>
  soloLectura: boolean
}

/**
 * Imágenes de diseño del proyecto (renders y planos): conecta la
 * `GaleriaImagenes` genérica con los endpoints de imágenes del proyecto.
 *
 * El tipo se elige ANTES de agregar y vale para todos los archivos de esa
 * tanda; cada imagen muestra el suyo. El orden es uno solo para toda la
 * galería, renders y planos juntos: así lo maneja el backend.
 *
 * Requiere que el proyecto YA exista: en el alta no se renderiza.
 */
export function GaleriaDisenoProyecto({ proyecto, soloLectura }: GaleriaDisenoProyectoProps) {
  const [tipo, setTipo] = useState<TipoImagenProyecto>('RENDER')

  const agregarImagen = useAgregarImagenProyecto()
  const ordenarImagenes = useOrdenarImagenesProyecto()
  const quitarImagen = useQuitarImagenProyecto()

  const id = proyecto.id_proyecto

  return (
    <GaleriaImagenes
      imagenes={proyecto.imagenes.map((imagen) => ({
        id: imagen.id_imagen_proyecto,
        url: imagen.url,
        orden: imagen.orden,
        etiqueta: TIPO_IMAGEN_PROYECTO_LABEL[imagen.tipo],
      }))}
      soloLectura={soloLectura}
      descripcionAlt={proyecto.nombre}
      textoVacio="Este proyecto no tiene imágenes de diseño"
      // El orden que calcula la galería no se manda: el backend la pone al final.
      onAgregar={(url) => agregarImagen.mutateAsync({ id, url, tipo })}
      onOrdenar={(idsImagenProyecto) => ordenarImagenes.mutateAsync({ id, idsImagenProyecto })}
      onQuitar={(idImagen) => quitarImagen.mutateAsync({ id, idImagen })}
      controlesAgregar={
        <Select
          size="sm"
          aria-label="Tipo de las imágenes a agregar"
          options={OPCIONES_TIPO}
          value={tipo}
          onChange={(evento) => setTipo(evento.target.value as TipoImagenProyecto)}
          className="w-32"
        />
      }
    />
  )
}
