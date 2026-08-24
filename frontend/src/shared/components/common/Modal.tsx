import { useId } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton } from '@/shared/components/ui/IconButton'
import { useDialogBehavior } from '@/shared/hooks/useDialogBehavior'
import { cn } from '@/shared/utils/cn'

export type ModalSize = 'sm' | 'md' | 'lg'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  icon?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: ModalSize
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
}

/**
 * Contenedor de diálogo: overlay oscuro + tarjeta centrada, en un portal sobre
 * `document.body`.
 *
 * Es solo el contenedor. No sabe nada de formularios, ni de entidades, ni de
 * qué botones lleva el footer: todo eso entra por `children` y `footer`.
 *
 * Props:
 * - `open`: mientras es `false` no se renderiza nada.
 * - `onClose`: se llama al tocar la X, al apretar Escape y al clickear el
 *   overlay. El componente no se cierra solo — quien lo usa maneja el estado.
 * - `title`: el título del header. Se usa como `aria-labelledby` del diálogo.
 * - `icon`: ícono opcional a la izquierda del título.
 * - `children`: el contenido del body. Es la única zona que scrollea.
 * - `footer`: los botones. Si no viene, la franja no se renderiza.
 * - `size`: ancho máximo de la tarjeta. `'sm'`, `'md'` (default) o `'lg'`.
 *   La altura máxima es siempre 85vh.
 * - `closeOnOverlayClick`: default `true`. El click solo cierra si el gesto
 *   empezó en el overlay: arrastrar desde adentro de la tarjeta hacia afuera
 *   (por ejemplo, seleccionando texto) no lo cierra.
 * - `closeOnEscape`: default `true`.
 *
 * El bloqueo de scroll, el focus trap y la restauración del foco los aporta
 * `useDialogBehavior`.
 */
export function Modal({
  open,
  onClose,
  title,
  icon,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: ModalProps) {
  const idTitulo = useId()
  const { tarjetaRef, manejarMouseDownOverlay } = useDialogBehavior({
    open,
    onClose,
    closeOnEscape,
    closeOnOverlayClick,
  })

  if (!open) return null

  return createPortal(
    <div
      onMouseDown={manejarMouseDownOverlay}
      className="bg-dark/50 fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        ref={tarjetaRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className={cn(
          'bg-fondotabla flex max-h-[85vh] w-full flex-col overflow-hidden rounded-lg shadow-xl outline-none',
          CLASES_TAMANIO[size]
        )}
      >
        <header className="bg-dark text-light flex shrink-0 items-center gap-3 px-6 py-4">
          {icon && (
            <span
              aria-hidden="true"
              className="inline-flex size-6 shrink-0 items-center justify-center [&>svg]:size-full"
            >
              {icon}
            </span>
          )}

          <h2 id={idTitulo} className="text-subtitulo flex-1">
            {title}
          </h2>

          <IconButton
            icon={<X />}
            ariaLabel="Cerrar"
            size="sm"
            iconColor="light"
            onClick={onClose}
            // `ghost` está pensado para fondo claro: su hover oscurece y su
            // outline de foco es del color del texto principal. Sobre el header
            // oscuro los dos serían invisibles.
            className="enabled:hover:bg-light/15 focus-visible:outline-light"
          />
        </header>

        <div className="text-content flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <footer className="border-subtle flex shrink-0 items-center justify-end gap-3 border-t px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  )
}

const CLASES_TAMANIO: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
}
