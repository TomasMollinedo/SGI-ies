import { useEffect, useRef } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'

interface OpcionesDialogo {
  open: boolean
  onClose: () => void
  closeOnEscape?: boolean
  closeOnOverlayClick?: boolean
}

/**
 * Comportamiento común a todos los diálogos del sistema (`Modal`,
 * `ConfirmDialog`): cerrar con Escape, bloquear el scroll de la página, atrapar
 * el foco adentro y devolverlo al cerrar.
 *
 * Es solo comportamiento: no renderiza nada ni impone estilos. Quien lo usa
 * pone el `tarjetaRef` en su tarjeta y el `manejarMouseDownOverlay` en el
 * overlay.
 *
 * Opciones:
 * - `open`: mientras es `false` no engancha ningún listener.
 * - `onClose`: se llama al apretar Escape y al clickear el overlay.
 * - `closeOnEscape` / `closeOnOverlayClick`: default `true`. Pasar `false`
 *   mientras hay una operación en curso evita que se cierre a mitad de camino.
 *
 * El foco inicial va al primer elemento enfocable de la tarjeta, en orden de
 * DOM. Para que caiga en un botón concreto, ese botón tiene que ser el primero.
 */
export function useDialogBehavior({
  open,
  onClose,
  closeOnEscape = true,
  closeOnOverlayClick = true,
}: OpcionesDialogo) {
  const tarjetaRef = useRef<HTMLDivElement>(null)
  const elementoPrevioRef = useRef<HTMLElement | null>(null)

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
      const fueraDelDialogo = !tarjeta.contains(activo)

      if (evento.shiftKey && (activo === primero || fueraDelDialogo)) {
        evento.preventDefault()
        ultimo.focus()
        return
      }

      if (!evento.shiftKey && (activo === ultimo || fueraDelDialogo)) {
        evento.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', manejarTab)
    return () => document.removeEventListener('keydown', manejarTab)
  }, [open])

  function manejarMouseDownOverlay(evento: ReactMouseEvent<HTMLDivElement>) {
    if (!closeOnOverlayClick) return

    // Solo cierra si el gesto EMPEZÓ en el overlay. Si arrancó adentro de la
    // tarjeta y terminó afuera, el target es la tarjeta y no cierra.
    if (evento.target === evento.currentTarget) onClose()
  }

  return { tarjetaRef, manejarMouseDownOverlay }
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
