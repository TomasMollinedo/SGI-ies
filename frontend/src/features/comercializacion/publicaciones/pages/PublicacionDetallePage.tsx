import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft, HandCoins, ShieldAlert, Undo2 } from 'lucide-react'
import { PATHS, rutaPlanesPagoPublicacion } from '@/app/router/paths'
import { ESTADO_PROYECTO_LABEL } from '@/features/proyectos/config/proyecto.config'
import { AuditInfo } from '@/shared/components/common/AuditInfo'
import { DetailRow } from '@/shared/components/common/DetailRow'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { Button } from '@/shared/components/ui/Button'
import { TIPOLOGIA_LABEL } from '@/shared/config/tipologiaUnidad.config'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { textoCondicionEntrega } from '@/shared/utils/condicionEntrega'
import { formatearFechaSinHora } from '@/shared/utils/fecha'
import { DespublicarPublicacionModal } from '../components/DespublicarPublicacionModal'
import { GaleriaUnidad } from '../components/GaleriaUnidad'
import { SeccionPublicacion } from '../components/SeccionPublicacion'
import {
  badgeEstadoPublicacion,
  estadoAnteriorTexto,
  puedeDespublicarse,
} from '../config/publicacion.config'
import { usePublicacionDetalle } from '../hooks/usePublicaciones'
import { formatearSuperficie } from '../utils/formatearSuperficie'

/** Texto largo (motivo, observaciones): alineado a la izquierda, con saltos de línea y sin desbordar. */
function TextoLargo({ children }: { children: ReactNode }) {
  return <span className="block text-left wrap-anywhere whitespace-pre-line">{children}</span>
}

const CLASES_FILA_LARGA = 'sm:flex-col sm:items-start sm:gap-1'

/**
 * Detalle de una publicación (HU-21): la unidad con sus datos heredados en
 * vivo, sus imágenes, el proyecto con la condición de entrega y la auditoría.
 * Es de solo lectura: lo único que se hace desde acá es despublicar o ir a los
 * planes de pago.
 */
export function PublicacionDetallePage() {
  const navigate = useNavigate()
  const { idPublicacion } = useParams()

  const [despublicando, setDespublicando] = useState(false)

  // Un id que no sea un entero positivo no se le pide al backend: la URL la
  // puede editar cualquiera a mano.
  const idNumerico = Number(idPublicacion)
  const idValido = Number.isInteger(idNumerico) && idNumerico > 0 ? idNumerico : null

  const { data: publicacion, isLoading, error, refetch } = usePublicacionDetalle(idValido)

  const statusCode = error?.statusCode

  useEffect(() => {
    if (statusCode === 401) navigate(PATHS.LOGIN, { replace: true })
  }, [statusCode, navigate])

  const volverAlListado = (
    <Button
      size="sm"
      icon={<ArrowLeft />}
      onClick={() => navigate(PATHS.COMERCIALIZACION.PUBLICACIONES)}
      title="Volver al listado de publicaciones"
    >
      Volver a Publicaciones
    </Button>
  )

  if (statusCode === 403) {
    return (
      <EmptyState
        icono={ShieldAlert}
        titulo="No tenés permisos para acceder a esta sección"
        descripcion="Se requiere el rol Administrador."
      />
    )
  }

  if (idValido === null || statusCode === 404) {
    return (
      <div className="space-y-4">
        {volverAlListado}
        <EmptyState
          titulo="No se encontró la publicación"
          descripcion="Puede no existir, o el enlace estar mal formado."
        />
      </div>
    )
  }

  if (error && statusCode !== 401) {
    return (
      <div className="space-y-4">
        {volverAlListado}
        <ErrorState mensaje={formatearMensajeError(error.message)} onReintentar={() => refetch()} />
      </div>
    )
  }

  if (isLoading || !publicacion) {
    return (
      <div className="space-y-4">
        {volverAlListado}
        <div className="flex justify-center py-10">
          <Spinner size={32} />
        </div>
      </div>
    )
  }

  const { unidad, proyecto } = publicacion
  const puedeDespublicar = publicacion.vigente && puedeDespublicarse(publicacion.estado_comercial)

  return (
    <div className="space-y-4">
      {volverAlListado}

      <section
        aria-label="Cabecera de la publicación"
        className="bg-fondotabla border-subtle flex flex-wrap items-start justify-between gap-4 rounded-lg border p-4 shadow-md"
      >
        <div className="min-w-0">
          <h2 className="text-content text-lg font-semibold wrap-anywhere">
            {unidad.identificador}
          </h2>
          <p className="text-content-muted text-sm wrap-anywhere">
            {proyecto.codigo} · {proyecto.nombre}
          </p>
          <div className="mt-2 flex flex-col items-start gap-1">
            {badgeEstadoPublicacion(publicacion)}
            {!publicacion.vigente && (
              <p className="text-content-muted text-xs">
                {estadoAnteriorTexto(publicacion.estado_comercial)}
              </p>
            )}
          </div>
        </div>

        {puedeDespublicar && (
          <Button variant="error" icon={<Undo2 />} onClick={() => setDespublicando(true)}>
            Despublicar
          </Button>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <SeccionPublicacion titulo="Datos de la unidad">
          <p className="text-content-muted mb-2 text-xs">
            Estos datos se administran en Unidades Funcionales y se reflejan acá automáticamente.
          </p>
          <DetailRow label="Identificador" value={unidad.identificador} />
          <DetailRow label="Tipología" value={TIPOLOGIA_LABEL[unidad.tipologia]} />
          <DetailRow
            label="Superficie cubierta"
            value={formatearSuperficie(unidad.superficie_cubierta)}
          />
          {unidad.superficie_descubierta !== null && (
            <DetailRow
              label="Superficie descubierta"
              value={formatearSuperficie(unidad.superficie_descubierta)}
            />
          )}
          {unidad.piso !== null && <DetailRow label="Piso" value={unidad.piso} />}
          {unidad.comodidades && (
            <DetailRow
              label="Comodidades"
              className={CLASES_FILA_LARGA}
              value={<TextoLargo>{unidad.comodidades}</TextoLargo>}
            />
          )}
          {unidad.observaciones && (
            <DetailRow
              label="Observaciones"
              className={CLASES_FILA_LARGA}
              value={<TextoLargo>{unidad.observaciones}</TextoLargo>}
            />
          )}
        </SeccionPublicacion>

        <SeccionPublicacion titulo="Proyecto y entrega">
          <DetailRow label="Código" value={proyecto.codigo} />
          <DetailRow label="Proyecto" value={proyecto.nombre} />
          <DetailRow label="Estado del proyecto" value={ESTADO_PROYECTO_LABEL[proyecto.estado]} />
          {proyecto.fecha_fin_estimada && (
            <DetailRow
              label="Fin estimado"
              value={formatearFechaSinHora(proyecto.fecha_fin_estimada)}
            />
          )}
          <DetailRow
            label="Condición de entrega"
            value={textoCondicionEntrega(publicacion.condicion_entrega)}
          />
        </SeccionPublicacion>
      </div>

      <SeccionPublicacion titulo="Imágenes">
        <GaleriaUnidad identificador={unidad.identificador} imagenes={publicacion.imagenes} />
      </SeccionPublicacion>

      <SeccionPublicacion titulo="Planes de pago">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-content-muted text-xs">
            El precio de la unidad se define en Planes de Pago, no acá.
          </p>
          <Button
            icon={<HandCoins />}
            onClick={() => navigate(rutaPlanesPagoPublicacion(publicacion.id_publicacion))}
            className="ml-auto"
          >
            Ver planes de pago
          </Button>
        </div>
      </SeccionPublicacion>

      <SeccionPublicacion titulo="Auditoría">
        {!publicacion.vigente && (
          <div className="mb-2">
            <DetailRow
              label="Motivo de despublicación"
              className={CLASES_FILA_LARGA}
              value={<TextoLargo>{publicacion.motivo_despublicacion ?? '—'}</TextoLargo>}
            />
          </div>
        )}
        <AuditInfo
          className="border-t-0 pt-0"
          createdAt={publicacion.fecha_publicacion}
          createdBy={{
            nombre: `${publicacion.usuarioCreador.nombre} ${publicacion.usuarioCreador.apellido}`,
          }}
          updatedAt={
            publicacion.vigente
              ? undefined
              : (publicacion.fecha_despublicacion ?? publicacion.hora_actualizacion ?? undefined)
          }
          updatedBy={
            publicacion.vigente
              ? undefined
              : {
                  nombre: `${publicacion.usuarioActualizador.nombre} ${publicacion.usuarioActualizador.apellido}`,
                }
          }
        />
      </SeccionPublicacion>

      <DespublicarPublicacionModal
        publicacion={
          despublicando
            ? {
                id_publicacion: publicacion.id_publicacion,
                identificador: unidad.identificador,
                proyecto: proyecto.nombre,
              }
            : null
        }
        onClose={() => setDespublicando(false)}
        onDespublicada={() => setDespublicando(false)}
      />
    </div>
  )
}
