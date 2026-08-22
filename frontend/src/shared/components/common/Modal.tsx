import { useEffect, useId, useRef } from 'react'
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton } from '@/shared/components/ui/IconButton'
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
 * Mientras está abierto bloquea el scroll de la página, atrapa el foco adentro
 * y, al cerrarse, lo devuelve al elemento que lo abrió.
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
  const tarjetaRef = useRef<HTMLDivElement>(null)
  const elementoPrevioRef = useRef<HTMLElement | null>(null)
  const idTitulo = useId()

  useEffect(() => {
    if (!open || !closeOnEscape) return

    function manejarEscape(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', manejarEscape)
    return () => document.removeEventListener('keydown', manejarEscape)
  }, [open, closeOnEscape, onClose])

  // Bloquea el scroll de la página y restaura el valor que hubiera antes, para
  // no pisar un overflow puesto por otro componente.
  useEffect(() => {
    if (!open) return

    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = overflowPrevio
    }
  }, [open])

  // Al abrir mueve el foco adentro; al cerrar lo devuelve a donde estaba.
  useEffect(() => {
    if (!open) return

    elementoPrevioRef.current = document.activeElement as HTMLElement | null

    const enfocables = obtenerEnfocables(tarjetaRef.current)
    const primerObjetivo = enfocables[0] ?? tarjetaRef.current
    primerObjetivo?.focus()

    return () => elementoPrevioRef.current?.focus()
  }, [open])

  // Focus trap: el Tab no se sale de la tarjeta.
  useEffect(() => {
    if (!open) return

    function manejarTab(evento: KeyboardEvent) {
      if (evento.key !== 'Tab') return

      const tarjeta = tarjetaRef.current
      if (!tarjeta) return

      const enfocables = obtenerEnfocables(tarjeta)
      if (enfocables.length === 0) {
        evento.preventDefault()
        return
      }

      const primero = enfocables[0]
      const ultimo = enfocables[enfocables.length - 1]
      const activo = document.activeElement
      const fueraDelModal = !tarjeta.contains(activo)

      if (evento.shiftKey && (activo === primero || fueraDelModal)) {
        evento.preventDefault()
        ultimo.focus()
        return
      }

      if (!evento.shiftKey && (activo === ultimo || fueraDelModal)) {
        evento.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', manejarTab)
    return () => document.removeEventListener('keydown', manejarTab)
  }, [open])

  if (!open) return null

  function manejarMouseDownOverlay(evento: ReactMouseEvent<HTMLDivElement>) {
    if (!closeOnOverlayClick) return

    // Solo cierra si el gesto EMPEZÓ en el overlay. Si arrancó adentro de la
    // tarjeta y terminó afuera, el target es la tarjeta y no cierra.
    if (evento.target === evento.currentTarget) onClose()
  }

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

const SELECTOR_ENFOCABLES = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/** Elementos que pueden recibir el foco dentro de la tarjeta, en orden de tab. */
function obtenerEnfocables(contenedor: HTMLElement | null): HTMLElement[] {
  if (!contenedor) return []

  return Array.from(contenedor.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES)).filter(
    // `offsetParent` en null descarta lo que está oculto con `display: none`.
    (elemento) => elemento.offsetParent !== null
  )
}
