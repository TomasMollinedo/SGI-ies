import { useNavigate } from 'react-router'
import { Plus } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { Button } from '@/shared/components/ui/Button'

/**
 * Pantalla raíz de Cobranzas (HU-30). Por ahora solo ofrece "Registrar
 * cobro" (T114): el listado de cobros con sus filtros y el resumen del
 * período los agrega T115 en esta misma página, y el botón pasa a su barra
 * de filtros (como "Nuevo pago" en `PagosPage`).
 */
export function CobranzasPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-content-muted text-sm">
        Registrá los cobros presenciales de cuotas de clientes.
      </p>
      <Button icon={<Plus />} onClick={() => navigate(PATHS.TESORERIA.COBRANZAS.NUEVO)}>
        Registrar cobro
      </Button>
    </div>
  )
}
