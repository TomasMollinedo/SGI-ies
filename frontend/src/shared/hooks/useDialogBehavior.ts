import { useEffect, useId, useRef } from 'react'
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
 *
 * Con diálogos anidados (un `ConfirmDialog` abierto sobre un `Modal`) solo
 * responde el de arriba: ver `pilaDialogos`.
 */
export function useDialogBehavior({
  open,
  onClose,
  closeOnEscape = true,
  closeOnOverlayClick = true,
}: OpcionesDialogo) {
  const tarjetaRef = useRef<HTMLDivElement>(null)
  const elementoPrevioRef = useRef<HTMLElement | null>(null)
  const idDialogo = useId()

  // Se apila al abrir y se desapila al cerrar, así el Escape y el focus trap
  // saben cuál es el diálogo de arriba en cada momento.
  useEffect(() => {
    if (!open) return

    pilaDialogos.push(idDialogo)

    return () => {
      const indice = pilaDialogos.lastIndexOf(idDialogo)
      if (indice !== -1) pilaDialogos.splice(indice, 1)
    }
  }, [open, idDialogo])

  useEffect(() => {
    if (!open || !closeOnEscape) return

    function manejarEscape(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && esElDialogoDeArriba(idDialogo)) onClose()
    }

    document.addEventListener('keydown', manejarEscape)
    return () => document.removeEventListener('keydown', manejarEscape)
  }, [open, closeOnEscape, onClose, idDialogo])

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

      // Sin esto, el trap del diálogo de abajo le robaría el foco al de arriba:
      // ve el foco "fuera de su tarjeta" y lo trae de vuelta.
      if (!esElDialogoDeArriba(idDialogo)) return

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
  }, [open, idDialogo])

  function manejarMouseDownOverlay(evento: ReactMouseEvent<HTMLDivElement>) {
    if (!closeOnOverlayClick) return

    // Solo cierra si el gesto EMPEZÓ en el overlay. Si arrancó adentro de la
    // tarjeta y terminó afuera, el target es la tarjeta y no cierra.
    if (evento.target === evento.currentTarget) onClose()
  }

  return { tarjetaRef, manejarMouseDownOverlay }
}

/**
 * Ids de los diálogos abiertos, del más viejo al más nuevo. Solo el último
 * atiende el Escape y atrapa el Tab: si respondieran todos, un `ConfirmDialog`
 * abierto sobre un `Modal` cerraría los dos de un solo Escape, y el trap del
 * modal de abajo le sacaría el foco al de arriba en cuanto tabulara.
 */
const pilaDialogos: string[] = []

function esElDialogoDeArriba(idDialogo: string): boolean {
  return pilaDialogos[pilaDialogos.length - 1] === idDialogo
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
