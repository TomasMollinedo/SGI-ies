import { CheckCheck } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import type { ButtonSize } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { useAtenderTodasLasAlertas } from '../hooks/useAlertas'

interface BotonAtenderTodasProps {
  size?: ButtonSize
  /** Se dispara solo si la operación salió bien (por ejemplo, para cerrar el modal). */
  onAtendidas?: () => void
}

/**
 * Marca de una sola vez todas las alertas pendientes del usuario. Vive acá, y
 * no dentro de una pantalla, porque la acción aparece en dos lugares: el modal
 * de la campanita y la pantalla de alertas.
 *
 * No se deshabilita cuando no hay pendientes: la pantalla puede estar filtrada
 * por alertas ya atendidas, y ahí lo que se ve no dice nada sobre cuántas
 * quedan pendientes. Si no había ninguna, el backend responde `atendidas: 0` y
 * se avisa con un toast informativo en vez de tratarlo como un error.
 */
export function BotonAtenderTodas({ size = 'md', onAtendidas }: BotonAtenderTodasProps) {
  const atenderTodas = useAtenderTodasLasAlertas()
  const toast = useToast()

  function manejarClick() {
    atenderTodas.mutate(undefined, {
      onSuccess: ({ atendidas }) => {
        if (atendidas === 0) {
          toast.info('No había alertas pendientes.')
        } else if (atendidas === 1) {
          toast.success('Se marcó 1 alerta como leída.')
        } else {
          toast.success(`Se marcaron ${atendidas} alertas como leídas.`)
        }
        onAtendidas?.()
      },
      onError: (error) => toast.error(formatearMensajeError(error.message)),
    })
  }

  return (
    <Button
      variant="success"
      size={size}
      icon={<CheckCheck />}
      loading={atenderTodas.isPending}
      onClick={manejarClick}
    >
      Marcar todas como leídas
    </Button>
  )
}
