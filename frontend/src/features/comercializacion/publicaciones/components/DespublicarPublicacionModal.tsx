import { useEffect, useState } from 'react'
import { Undo2, X } from 'lucide-react'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { useDespublicarPublicacion } from '../hooks/usePublicaciones'
import { AlertaInline } from './AlertaInline'

const MAX_MOTIVO = 500

/** Lo mínimo que el modal necesita saber de la publicación a despublicar. */
export interface PublicacionADespublicar {
  id_publicacion: number
  identificador: string
  proyecto: string
}

interface DespublicarPublicacionModalProps {
  /** La publicación a despublicar; `null` mantiene el modal cerrado. */
  publicacion: PublicacionADespublicar | null
  onClose: () => void
  /** Se llama después del PATCH exitoso y del toast. Quien lo usa decide qué hacer (cerrar, reintentar, etc.). */
  onDespublicada: () => void
}

/**
 * Modal de despublicación: pide el motivo (obligatorio, con trim, hasta 500
 * caracteres) y llama al PATCH. Lo usan la fila del listado y el flujo de
 * "ya publicada" al publicar. Si el backend rechaza (ej. 409 porque el estado
 * cambió en paralelo), el mensaje queda visible acá y el listado se refresca
 * solo, porque la mutación invalida la cache.
 */
export function DespublicarPublicacionModal({
  publicacion,
  onClose,
  onDespublicada,
}: DespublicarPublicacionModalProps) {
  const toast = useToast()
  const despublicar = useDespublicarPublicacion()
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<ApiErrorResponse | null>(null)

  const idPublicacion = publicacion?.id_publicacion ?? null
  useEffect(() => {
    setMotivo('')
    setError(null)
  }, [idPublicacion])

  const motivoLimpio = motivo.trim()
  const motivoValido = motivoLimpio.length > 0 && motivoLimpio.length <= MAX_MOTIVO
  const cargando = despublicar.isPending

  function confirmar() {
    if (!publicacion || !motivoValido) return

    setError(null)
    despublicar.mutate(
      { id: publicacion.id_publicacion, payload: { motivo_despublicacion: motivoLimpio } },
      {
        onSuccess: () => {
          toast.success(`Unidad ${publicacion.identificador} despublicada.`)
          onDespublicada()
        },
        onError: (falla) => setError(falla),
      }
    )
  }

  return (
    <Modal
      open={publicacion !== null}
      onClose={onClose}
      title="Despublicar unidad"
      icon={<Undo2 />}
      size="sm"
      closeOnEscape={!cargando}
      closeOnOverlayClick={!cargando}
      footer={
        <>
          <Button variant="error" icon={<X />} onClick={onClose} disabled={cargando}>
            Cancelar
          </Button>
          <Button
            variant="success"
            icon={<Undo2 />}
            onClick={confirmar}
            loading={cargando}
            disabled={!motivoValido || cargando}
          >
            Despublicar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {publicacion && (
          <div className="text-sm">
            <p className="text-content font-medium break-words">{publicacion.identificador}</p>
            <p className="text-content-muted break-words">{publicacion.proyecto}</p>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <Input
            label="Motivo de la despublicación"
            required
            multiline
            rows={3}
            maxLength={MAX_MOTIVO}
            placeholder="Ej. la unidad se retira de la venta"
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value)}
            disabled={cargando}
          />
          <p className="text-content-muted text-right text-xs" aria-live="polite">
            {motivo.length}/{MAX_MOTIVO}
          </p>
        </div>

        {error && <AlertaInline>{formatearMensajeError(error.message)}</AlertaInline>}
      </div>
    </Modal>
  )
}
