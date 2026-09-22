import { X } from 'lucide-react'
import { ClienteSesionMenu } from '@/features/ecommerce/layout/components/ClienteSesionMenu'
import { useDialogBehavior } from '@/shared/hooks/useDialogBehavior'
import { HEADER } from '@/features/ecommerce/config/sitioPublico.config'
import type { IdSeccion } from '@/features/ecommerce/types/sitioPublico.types'
import { SitioPublicoNavLinks } from './SitioPublicoNavLinks'

interface MenuMobileLandingProps {
  abierto: boolean
  onCerrar: () => void
  seccionActiva: IdSeccion | null
  seccionesVisibles: readonly IdSeccion[]
}

/**
 * Panel de navegación del sitio público en pantallas angostas (hasta `lg`).
 * Toma de `useDialogBehavior` el
 * mismo comportamiento que los modales del sistema: cierra con Escape y con
 * click afuera, atrapa el foco adentro y bloquea el scroll del fondo.
 */
export function SitioPublicoMenuMobile({
  abierto,
  onCerrar,
  seccionActiva,
  seccionesVisibles,
}: MenuMobileLandingProps) {
  const { tarjetaRef, manejarMouseDownOverlay } = useDialogBehavior({
    open: abierto,
    onClose: onCerrar,
  })

  if (!abierto) return null

  return (
    <div
      onMouseDown={manejarMouseDownOverlay}
      className="bg-dark/70 fixed inset-0 z-40 lg:hidden"
      role="presentation"
    >
      <div
        ref={tarjetaRef}
        id="menu-sitio-publico"
        role="dialog"
        aria-modal="true"
        aria-label={HEADER.tituloMenu}
        className="bg-dark border-primary ml-auto flex h-full w-full max-w-xs flex-col gap-6 border-l p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onCerrar}
          aria-label={HEADER.cerrarMenu}
          className="text-light hover:text-secondary focus-visible:outline-light -mr-2 self-end rounded p-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <X size={22} aria-hidden="true" />
        </button>

        <SitioPublicoNavLinks
          seccionActiva={seccionActiva}
          seccionesVisibles={seccionesVisibles}
          onNavegar={onCerrar}
        />

        <div className="border-light/20 mt-auto border-t pt-6">
          <ClienteSesionMenu
            onNavegar={onCerrar}
            variante="landing"
            etiquetaLogin={HEADER.iniciarSesion}
          />
        </div>
      </div>
    </div>
  )
}
