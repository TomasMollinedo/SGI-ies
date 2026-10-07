import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Tag } from 'lucide-react'
import { rutaDetallePublicacion } from '@/app/router/paths'
import { tieneVenta } from '@/features/comercializacion/planes-pago/config/planPago.config'
import { SeccionPublicacion } from '@/features/comercializacion/publicaciones/components/SeccionPublicacion'
import {
  PUBLICACIONES_QUERY_KEYS,
  listarPublicaciones,
} from '@/features/comercializacion/publicaciones/services/publicaciones.service'
import type {
  PublicacionListItem,
  PublicacionesQuery,
} from '@/features/comercializacion/publicaciones/types/publicacion.types'
import { Button } from '@/shared/components/ui/Button'
import { Spinner } from '@/shared/components/ui/Spinner'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import { formatearImporte } from '@/shared/utils/importe'
import type { UnidadFuncionalDetalle } from '../types/unidadFuncional.types'

/** El backend limita a 100 por página; las unidades de un proyecto planificado entran de sobra. */
const LIMITE_PUBLICACIONES_PROYECTO = 100

interface SeccionPrecioListaUnidadProps {
  unidad: UnidadFuncionalDetalle
}

/**
 * Precio de lista de la unidad, con acceso directo a donde se define: el
 * detalle de su publicación vigente (HU-22). La API no relaciona la unidad con
 * su publicación, así que se busca entre las publicaciones vigentes de su
 * proyecto. Una unidad sin publicación vigente no tiene precio que definir.
 */
export function SeccionPrecioListaUnidad({ unidad }: SeccionPrecioListaUnidadProps) {
  const navigate = useNavigate()
  const publicada = unidad.estado_comercial !== 'SIN_PUBLICAR'

  const filtros: PublicacionesQuery = {
    vigente: true,
    FK_proyecto: unidad.FK_proyecto,
    page: 1,
    limit: LIMITE_PUBLICACIONES_PROYECTO,
  }

  // `enabled`: sin publicación vigente no hay nada que buscar. Misma clave que
  // `usePublicaciones`, así los cambios de precio (que invalidan `publicaciones`) la refrescan.
  const { data, isLoading, error } = useQuery<
    PaginatedResponse<PublicacionListItem>,
    ApiErrorResponse
  >({
    queryKey: PUBLICACIONES_QUERY_KEYS.LISTA(filtros),
    queryFn: ({ signal }) => listarPublicaciones(filtros, signal),
    enabled: publicada,
  })

  const publicacion = data?.data.find(
    (item) => item.unidad.id_unidad_funcional === unidad.id_unidad_funcional
  )

  return (
    <SeccionPublicacion titulo="Precio de lista">
      {!publicada && (
        <p className="text-content-muted text-xs">
          La unidad no tiene una publicación vigente. Publicala desde Comercialización para poder
          definir su precio de lista.
        </p>
      )}

      {publicada && isLoading && <Spinner className="text-primary size-5" />}

      {publicada && error && (
        <p className="text-error text-xs">No se pudo cargar la publicación de la unidad.</p>
      )}

      {publicada && publicacion && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-content text-sm wrap-anywhere">
            {publicacion.precio_lista === null
              ? 'Todavía no se definió el precio de lista.'
              : formatearImporte(Number(publicacion.precio_lista))}
          </p>
          <Button
            variant="primary"
            icon={<Tag />}
            onClick={() => navigate(rutaDetallePublicacion(publicacion.id_publicacion))}
          >
            {publicacion.precio_lista === null
              ? 'Definir precio de lista'
              : tieneVenta(publicacion.estado_comercial)
                ? 'Ver precio de lista'
                : 'Modificar precio de lista'}
          </Button>
        </div>
      )}
    </SeccionPublicacion>
  )
}
