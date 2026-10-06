import { useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import type { SelectOption } from '@/shared/components/ui/Select'
import { Button } from '@/shared/components/ui/Button'
import { useDialogBehavior } from '@/shared/hooks/useDialogBehavior'
import type { FiltrosCatalogo } from '@/features/ecommerce/types/catalogoPublico.types'
import { FILTROS } from '../config/catalogo.config'
import { ControlesFiltros } from './ControlesFiltros'

interface BarraFiltrosProps {
  filtros: FiltrosCatalogo
  opcionesProyecto: SelectOption[]
  hayFiltros: boolean
  onProyecto: (valor: string) => void
  onTipologia: (valor: string) => void
  onEntrega: (valor: string) => void
  onLimpiar: () => void
}

/**
 * Filtros del catálogo: en línea desde `lg`, y en un panel que se abre con un
 * botón en pantallas más angostas, donde tres desplegables en fila no entran.
 *
 * Los controles son los mismos en los dos casos y escriben directo en la URL,
 * así que el panel no necesita un botón de "aplicar": cada cambio ya se ve
 * reflejado detrás.
 */
export function BarraFiltros(props: BarraFiltrosProps) {
  const [panelAbierto, setPanelAbierto] = useState(false)
  const cerrar = () => setPanelAbierto(false)
  const { tarjetaRef, manejarMouseDownOverlay } = useDialogBehavior({
    open: panelAbierto,
    onClose: cerrar,
  })

  return (
    <>
      <ControlesFiltros {...props} className="hidden lg:flex" />

      <Button
        variant="primary"
        icon={<SlidersHorizontal />}
        onClick={() => setPanelAbierto(true)}
        aria-expanded={panelAbierto}
        aria-controls="panel-filtros-catalogo"
        className="lg:hidden"
      >
        {FILTROS.abrir}
      </Button>

      {panelAbierto && (
        <div
          onMouseDown={manejarMouseDownOverlay}
          role="presentation"
          className="bg-dark/70 fixed inset-0 z-40 flex items-end lg:hidden"
        >
          <div
            ref={tarjetaRef}
            id="panel-filtros-catalogo"
            role="dialog"
            aria-modal="true"
            aria-label={FILTROS.titulo}
            className="bg-dark-deep border-primary max-h-full w-full overflow-y-auto border-t p-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-light font-mono text-xs tracking-widest uppercase">
                {FILTROS.titulo}
              </h2>
              <button
                type="button"
                onClick={cerrar}
                aria-label={FILTROS.cerrar}
                className="text-light hover:text-secondary focus-visible:outline-light -mr-2 rounded p-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <ControlesFiltros {...props} />

            <Button variant="success" onClick={cerrar} fullWidth className="mt-6">
              {FILTROS.aplicar}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
