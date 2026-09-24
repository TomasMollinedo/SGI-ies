import { useEffect, useState } from 'react'
import { Check, MessageSquare, X } from 'lucide-react'
import { AlertaInline } from '@/features/comercializacion/publicaciones/components/AlertaInline'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { formatearFechaHora } from '@/shared/utils/fecha'
import { badgeEstadoConsulta } from '../config/consulta.config'
import { useResponderConsulta } from '../hooks/useConsultas'
import type { ConsultaInterna } from '../types/consulta.types'

const MAX_RESPUESTA = 1000

interface DetalleConsultaModalProps {
  /** Consulta a ver/responder. `null` mantiene el modal cerrado. */
  consulta: ConsultaInterna | null
  onClose: () => void
  /** Se llama después de responder con éxito. */
  onRespondida: () => void
}

/**
 * Detalle de una consulta. Si ya está Respondida se ve en modo lectura, sin
 * ninguna acción (no se puede volver a responder ni editar la respuesta).
 * Si está Pendiente, pide la respuesta y avisa explícitamente que una vez
 * enviada no se puede editar.
 *
 * Mismo patrón que `DespublicarPublicacionModal`: un solo campo de texto +
 * confirmar directo en el footer del `Modal`, sin un paso de confirmación
 * aparte — la consulta que se está respondiendo ya queda visible arriba del
 * campo, así que el usuario ve qué está respondiendo antes de tocar "Responder".
 */
export function DetalleConsultaModal({ consulta, onClose, onRespondida }: DetalleConsultaModalProps) {
  const responder = useResponderConsulta()
  const [respuesta, setRespuesta] = useState('')
  const [error, setError] = useState<ApiErrorResponse | null>(null)

  const idConsulta = consulta?.id_consulta ?? null
  useEffect(() => {
    setRespuesta('')
    setError(null)
  }, [idConsulta])

  const yaRespondida = consulta?.estado === 'RESPONDIDA'
  const respuestaLimpia = respuesta.trim()
  const respuestaValida = respuestaLimpia.length > 0 && respuestaLimpia.length <= MAX_RESPUESTA
  const cargando = responder.isPending

  function confirmar() {
    if (!consulta || !respuestaValida) return

    setError(null)
    responder.mutate(
      { id: consulta.id_consulta, payload: { respuesta: respuestaLimpia } },
      {
        onSuccess: onRespondida,
        onError: (falla) => setError(falla),
      }
    )
  }

  return (
    <Modal
      open={consulta !== null}
      onClose={onClose}
      title={yaRespondida ? 'Consulta respondida' : 'Responder consulta'}
      icon={<MessageSquare />}
      closeOnEscape={!cargando}
      closeOnOverlayClick={!cargando}
      footer={
        <>
          <Button variant="error" icon={<X />} onClick={onClose} disabled={cargando}>
            {yaRespondida ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!yaRespondida && (
            <Button
              variant="success"
              icon={<Check />}
              onClick={confirmar}
              loading={cargando}
              disabled={!respuestaValida || cargando}
            >
              Responder
            </Button>
          )}
        </>
      }
    >
      {consulta && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="text-sm">
              <p className="text-content font-medium break-words">
                {consulta.unidad.identificador} · {consulta.unidad.proyecto.nombre}
              </p>
              <p className="text-content-muted break-words">
                {consulta.cliente.nombre} {consulta.cliente.apellido ?? ''} · {consulta.cliente.email}
              </p>
            </div>
            {badgeEstadoConsulta(consulta.estado)}
          </div>

          <div className="border-subtle bg-surface-muted rounded-md border p-3">
            <p className="text-content-muted text-xs font-medium uppercase">Consulta</p>
            <p className="text-content mt-1 text-sm wrap-anywhere">{consulta.texto}</p>
            <p className="text-content-muted mt-2 text-xs">
              {formatearFechaHora(consulta.hora_creacion)}
            </p>
          </div>

          {yaRespondida ? (
            <div className="border-subtle rounded-md border p-3">
              <p className="text-content-muted text-xs font-medium uppercase">Respuesta</p>
              <p className="text-content mt-1 text-sm wrap-anywhere">{consulta.respuesta}</p>
              {consulta.fecha_respuesta && (
                <p className="text-content-muted mt-2 text-xs">
                  {formatearFechaHora(consulta.fecha_respuesta)}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <Input
                label="Respuesta"
                required
                multiline
                rows={4}
                maxLength={MAX_RESPUESTA}
                placeholder="Escribí la respuesta para el cliente"
                value={respuesta}
                onChange={(evento) => setRespuesta(evento.target.value)}
                disabled={cargando}
              />
              <p className="text-content-muted text-right text-xs" aria-live="polite">
                {respuesta.length}/{MAX_RESPUESTA}
              </p>
              <p className="text-warning text-xs">
                Una vez enviada, la respuesta no se puede editar ni volver a responder esta consulta.
              </p>
            </div>
          )}

          {error && <AlertaInline>{formatearMensajeError(error.message)}</AlertaInline>}
        </div>
      )}
    </Modal>
  )
}
