import { useEffect, useRef, useState } from 'react'
import type { FocusEvent } from 'react'

/**
 * Comportamiento de un menú desplegable anclado a su botón: se cierra con
 * Escape, al hacer clic afuera y cuando el foco se va del menú con Tab.
 *
 * No es un diálogo, así que a propósito no usa `useDialogBehavior`: no bloquea
 * el scroll de la página ni atrapa el foco adentro — tabular fuera del menú
 * tiene que llevar al resto del header, no quedar dando vueltas.
 *
 * Quien lo usa pone `contenedorRef` y `manejarBlur` en el envoltorio (botón +
 * panel) y `botonRef` en el botón, para que Escape le devuelva el foco.
 */
export function useMenuDesplegable() {
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const botonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!abierto) return

    function manejarPointerDown(evento: PointerEvent) {
      if (!contenedorRef.current?.contains(evento.target as Node)) setAbierto(false)
    }

    function manejarEscape(evento: KeyboardEvent) {
      if (evento.key !== 'Escape') return

      setAbierto(false)
      botonRef.current?.focus()
    }

    document.addEventListener('pointerdown', manejarPointerDown)
    document.addEventListener('keydown', manejarEscape)

    return () => {
      document.removeEventListener('pointerdown', manejarPointerDown)
      document.removeEventListener('keydown', manejarEscape)
    }
  }, [abierto])

  /** `relatedTarget` es adónde va el foco: si cae fuera del menú, se cierra. */
  function manejarBlur(evento: FocusEvent<HTMLDivElement>) {
    if (!evento.currentTarget.contains(evento.relatedTarget)) setAbierto(false)
  }

  return {
    abierto,
    alternar: () => setAbierto((valor) => !valor),
    cerrar: () => setAbierto(false),
    contenedorRef,
    botonRef,
    manejarBlur,
  }
}
