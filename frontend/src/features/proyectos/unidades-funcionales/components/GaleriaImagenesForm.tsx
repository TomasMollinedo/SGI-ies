import { GaleriaImagenes } from '@/features/proyectos/components/GaleriaImagenes'
import {
  useAgregarImagenUnidadFuncional,
  useOrdenarImagenesUnidadFuncional,
  useQuitarImagenUnidadFuncional,
} from '../hooks/useUnidadesFuncionales'
import type { ImagenUnidad } from '../types/unidadFuncional.types'

interface GaleriaImagenesFormProps {
  idUnidadFuncional: number
  identificador: string
  imagenes: ImagenUnidad[]
  soloLectura: boolean
}

/**
 * Galería editable de la unidad: conecta la `GaleriaImagenes` genérica con los
 * endpoints de imágenes de la unidad funcional.
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
  const agregarImagen = useAgregarImagenUnidadFuncional()
  const ordenarImagenes = useOrdenarImagenesUnidadFuncional()
  const quitarImagen = useQuitarImagenUnidadFuncional()

  return (
    <GaleriaImagenes
      imagenes={imagenes.map((imagen) => ({
        id: imagen.id_imagen_unidad,
        url: imagen.url,
        orden: imagen.orden,
      }))}
      soloLectura={soloLectura}
      descripcionAlt={identificador}
      textoVacio="Esta unidad no tiene imágenes"
      onAgregar={(url, orden) => agregarImagen.mutateAsync({ id: idUnidadFuncional, url, orden })}
      onOrdenar={(idsImagenUnidad) =>
        ordenarImagenes.mutateAsync({ id: idUnidadFuncional, idsImagenUnidad })
      }
      onQuitar={(idImagen) => quitarImagen.mutateAsync({ id: idUnidadFuncional, idImagen })}
    />
  )
}
