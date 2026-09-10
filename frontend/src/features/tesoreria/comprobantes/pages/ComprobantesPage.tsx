import { useState } from 'react'
import { Plus, Receipt } from 'lucide-react'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { Button } from '@/shared/components/ui/Button'
import { ComprobanteForm } from '../components/ComprobanteForm'

/**
 * Comprobantes de proveedor. cubre solo la cabecera del formulario
 * de alta;
 */
export function ComprobantesPage() {
  const [formularioAbierto, setFormularioAbierto] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button icon={<Plus />} onClick={() => setFormularioAbierto(true)}>
          Nuevo comprobante
        </Button>
      </div>

      <EmptyState
        icono={Receipt}
        titulo="Cargá tu primer comprobante"
        descripcion="Usá «Nuevo comprobante» para registrar una factura, nota de débito o nota de crédito de un proveedor."
      />

      <ComprobanteForm open={formularioAbierto} onClose={() => setFormularioAbierto(false)} />
    </div>
  )
}