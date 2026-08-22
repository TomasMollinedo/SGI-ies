import { useEffect } from 'react'
import { CircleCheck, CircleX, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import { IconButton } from '@/shared/components/ui/IconButton'
import type { ToastTipo } from '@/shared/components/common/toastContext'
import { cn } from '@/shared/utils/cn'

interface ToastProps {
  id: string
  tipo: ToastTipo
  mensaje: string
  saliendo: boolean
  onClose: (id: string) => void
}

/** Cuánto queda visible un toast antes de cerrarse solo. */
const DURACION_VISIBLE = 4000

/**
 * La notificación en sí. Es puramente visual: recibe un mensaje ya armado y no
 * sabe nada del backend ni de cómo se generó. No se usa directamente desde las
 * pantallas — para eso está `useToast()`.
 *
 * Props:
 * - `id`, `tipo`, `mensaje`: los datos del toast.
 * - `saliendo`: cuando pasa a `true` corre la animación de salida y se frena el
 *   autocierre. Quien lo desmonta es el `ToastProvider`.
 * - `onClose`: se llama con el `id`, tanto al tocar la X como a los 4 segundos.
 */
export function Toast({ id, tipo, mensaje, saliendo, onClose }: ToastProps) {
  useEffect(() => {
    // Ya se está yendo: no tiene sentido volver a programar el cierre.
    if (saliendo) return

    const temporizador = setTimeout(() => onClose(id), DURACION_VISIBLE)
    return () => clearTimeout(temporizador)
  }, [id, saliendo, onClose])

  const { Icono, colorIcono, borde } = CONFIG_TIPO[tipo]

  return (
    <div
      className={cn(
        'border-subtle bg-surface pointer-events-auto flex w-80 items-center gap-3 rounded-md border border-l-4 p-3 shadow-lg',
        borde,
        saliendo ? 'animate-toast-out' : 'animate-toast-in',
        'motion-reduce:animate-none'
      )}
    >
      <Icono aria-hidden="true" className={cn('size-5 shrink-0', colorIcono)} />

      <p className="text-content flex-1 text-xs">{mensaje}</p>

      <IconButton
        icon={<X />}
        ariaLabel="Cerrar notificación"
        size="sm"
        iconColor="content-muted"
        onClick={() => onClose(id)}
      />
    </div>
  )
}

const CONFIG_TIPO: Record<ToastTipo, { Icono: LucideIcon; colorIcono: string; borde: string }> = {
  success: { Icono: CircleCheck, colorIcono: 'text-success', borde: 'border-l-success' },
  error: { Icono: CircleX, colorIcono: 'text-error', borde: 'border-l-error' },
  warning: { Icono: TriangleAlert, colorIcono: 'text-warning', borde: 'border-l-warning' },
  info: { Icono: Info, colorIcono: 'text-info', borde: 'border-l-info' },
}
