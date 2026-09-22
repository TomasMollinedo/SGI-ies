import { useEffect, useState } from 'react'
import { ArrowLeft, Megaphone, Undo2 } from 'lucide-react'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { TIPOLOGIA_LABEL } from '@/shared/config/tipologiaUnidad.config'
import { ESTADO_COMERCIAL_META, puedeDespublicarse } from '../config/publicacion.config'
import { useCrearPublicacion, usePublicacionDetalle } from '../hooks/usePublicaciones'
import type { UnidadPublicable } from '../types/publicacion.types'
import { extraerIdPublicacionVigente } from '../utils/publicacionVigenteError'
import { AlertaInline } from './AlertaInline'
import { DespublicarPublicacionModal } from './DespublicarPublicacionModal'
import type { PublicacionADespublicar } from './DespublicarPublicacionModal'
import { SelectorUnidadModal } from './SelectorUnidadModal'

interface PublicarUnidadModalProps {
  open: boolean
  onClose: () => void
  /** Se llama cuando la publicación se creó, para que la página vuelva a la primera página. */
  onPublicada: () => void
}

/**
 * Flujo de publicar: tabla emergente de unidades → paso de confirmación.
 *
 * Los rechazos del backend (409: proyecto en planificación o cancelado, unidad
 * dada de baja, o unidad ya publicada) se muestran como alerta persistente en
 * la confirmación. En el caso "ya publicada" se consulta esa publicación
 * vigente: si se puede despublicar se ofrece hacerlo y, al terminar, se vuelve
 * a la confirmación para reintentar. Cualquier otro error va a un toast.
 */
export function PublicarUnidadModal({ open, onClose, onPublicada }: PublicarUnidadModalProps) {
  const toast = useToast()
  const crear = useCrearPublicacion()

  const [unidad, setUnidad] = useState<UnidadPublicable | null>(null)
  const [rechazo, setRechazo] = useState<ApiErrorResponse | null>(null)
  const [despublicando, setDespublicando] = useState<PublicacionADespublicar | null>(null)

  useEffect(() => {
    if (open) return
    setUnidad(null)
    setRechazo(null)
    setDespublicando(null)
  }, [open])

  const idVigente = rechazo ? extraerIdPublicacionVigente(rechazo) : null
  const vigente = usePublicacionDetalle(idVigente)

  function volverALaTabla() {
    setUnidad(null)
    setRechazo(null)
  }

  function publicar() {
    if (!unidad) return

    setRechazo(null)
    crear.mutate(
      { FK_unidad_funcional: unidad.unidad.id_unidad_funcional },
      {
        onSuccess: () => {
          toast.success(
            `Unidad ${unidad.unidad.identificador} publicada. Quedó en ${ESTADO_COMERCIAL_META.EN_PREPARACION.label}.`
          )
          onPublicada()
          onClose()
        },
        onError: (falla) => {
          if (falla.statusCode === 409) setRechazo(falla)
          else toast.error(formatearMensajeError(falla.message))
        },
      }
    )
  }

  function alDespublicarVigente() {
    setDespublicando(null)
    setRechazo(null)
  }

  const puedeOfrecerDespublicar =
    vigente.data !== undefined && puedeDespublicarse(vigente.data.estado_comercial)

  return (
    <>
      <SelectorUnidadModal
        open={open && unidad === null}
        onClose={onClose}
        onSeleccionar={setUnidad}
      />

      <Modal
        open={open && unidad !== null && despublicando === null}
        onClose={onClose}
        title="Confirmar publicación"
        icon={<Megaphone />}
        size="sm"
        closeOnEscape={!crear.isPending}
        closeOnOverlayClick={!crear.isPending}
        footer={
          <>
            <Button
              variant="error"
              icon={<ArrowLeft />}
              onClick={volverALaTabla}
              disabled={crear.isPending}
            >
              Volver a la tabla
            </Button>
            <Button
              variant="success"
              icon={<Megaphone />}
              onClick={publicar}
              loading={crear.isPending}
              disabled={crear.isPending}
            >
              Publicar
            </Button>
          </>
        }
      >
        {unidad && (
          <div className="flex flex-col gap-4">
            <dl className="text-sm">
              <div className="mb-2">
                <dt className="text-content-muted text-xs">Unidad</dt>
                <dd className="text-content font-medium break-words">
                  {unidad.unidad.identificador}
                </dd>
              </div>
              <div className="mb-2">
                <dt className="text-content-muted text-xs">Proyecto</dt>
                <dd className="text-content break-words">{unidad.proyecto.nombre}</dd>
              </div>
              <div>
                <dt className="text-content-muted text-xs">Tipología</dt>
                <dd className="text-content">{TIPOLOGIA_LABEL[unidad.unidad.tipologia]}</dd>
              </div>
            </dl>

            <p className="text-content-muted text-xs">
              La publicación nace en «{ESTADO_COMERCIAL_META.EN_PREPARACION.label}» y pasa a «
              {ESTADO_COMERCIAL_META.DISPONIBLE.label}» automáticamente cuando la unidad tenga un
              plan de pago activo.
            </p>

            {rechazo && (
              <AlertaInline>
                <p>{formatearMensajeError(rechazo.message)}</p>

                {idVigente !== null && (
                  <div className="mt-2 flex flex-col items-start gap-2">
                    {vigente.isLoading && <p>Consultando la publicación vigente…</p>}

                    {vigente.isError && (
                      <p>No se pudo consultar el estado de la publicación vigente.</p>
                    )}

                    {vigente.data && puedeOfrecerDespublicar && (
                      <Button
                        size="sm"
                        variant="error"
                        icon={<Undo2 />}
                        onClick={() =>
                          setDespublicando({
                            id_publicacion: vigente.data.id_publicacion,
                            identificador: vigente.data.unidad.identificador,
                            proyecto: vigente.data.proyecto.nombre,
                          })
                        }
                      >
                        Despublicar la publicación vigente
                      </Button>
                    )}

                    {vigente.data && !puedeOfrecerDespublicar && (
                      <p>
                        La publicación vigente está «
                        {ESTADO_COMERCIAL_META[vigente.data.estado_comercial].label}» y no puede
                        despublicarse en ese estado.
                      </p>
                    )}
                  </div>
                )}
              </AlertaInline>
            )}
          </div>
        )}
      </Modal>

      <DespublicarPublicacionModal
        publicacion={despublicando}
        onClose={() => setDespublicando(null)}
        onDespublicada={alDespublicarVigente}
      />
    </>
  )
}
