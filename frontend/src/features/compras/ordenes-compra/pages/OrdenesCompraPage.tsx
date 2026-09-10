import { useState } from 'react'
import { ClipboardList, Plus } from 'lucide-react'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { OrdenCompraForm } from '../components/OrdenCompraForm'
import { useCambiarEstadoOrdenCompra, useCrearOrdenCompra } from '../hooks/useOrdenesCompra'
import type { OrdenCompraFormOutput } from '../types/ordenCompra.schema'
import type { CrearOrdenCompraPayload } from '../types/ordenCompra.types'
import { formatearCodigoOrdenCompra } from '../utils/codigoOrdenCompra'

function construirPayload(payload: OrdenCompraFormOutput): CrearOrdenCompraPayload {
  return {
    fecha_emision: payload.fecha_emision,
    fecha_entrega_solicitada: payload.fecha_entrega_solicitada || undefined,
    observaciones: payload.observaciones || undefined,
    FK_proveedor: payload.FK_proveedor,
    FK_deposito: payload.FK_deposito,
    detalle: payload.detalle,
  }
}

/**
 * Alta de una orden de compra (T68): la modal "Nueva orden" con su cabecera y
 * grilla de detalle. El listado, el detalle y el cambio manual de estado
 * desde la tabla son alcance de otras historias — acá solo se puede cargar
 * una orden y confirmarla.
 */
export function OrdenesCompraPage() {
  const toast = useToast()
  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const [error, setError] = useState<ApiErrorResponse | null>(null)

  const crear = useCrearOrdenCompra()
  const cambiarEstado = useCambiarEstadoOrdenCompra()

  function cerrarFormulario() {
    setFormularioAbierto(false)
    setError(null)
  }

  function manejarGuardarBorrador(payload: OrdenCompraFormOutput) {
    setError(null)
    crear.mutate(construirPayload(payload), {
      onSuccess: (orden) => {
        toast.success(
          `Orden de compra ${formatearCodigoOrdenCompra(orden.id_orden_compra)} guardada como borrador.`
        )
        cerrarFormulario()
      },
      onError: (error) => setError(error),
    })
  }

  // Confirmar y emitir es una creación (BORRADOR) seguida del cambio de
  // estado a EMITIDA: son las dos llamadas que ya expone el backend, no un
  // endpoint nuevo.
  function manejarConfirmarYEmitir(payload: OrdenCompraFormOutput) {
    setError(null)
    crear.mutate(construirPayload(payload), {
      onSuccess: (orden) => {
        cambiarEstado.mutate(
          { id: orden.id_orden_compra, payload: { estado: 'EMITIDA' } },
          {
            onSuccess: () => {
              toast.success(
                `Orden de compra ${formatearCodigoOrdenCompra(orden.id_orden_compra)} confirmada y emitida.`
              )
              cerrarFormulario()
            },
            onError: (error) => setError(error),
          }
        )
      },
      onError: (error) => setError(error),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button icon={<Plus />} onClick={() => setFormularioAbierto(true)}>
          Nueva orden de compra
        </Button>
      </div>

      <EmptyState
        icono={ClipboardList}
        titulo="Cargá tu primera orden de compra"
        descripcion="Usá «Nueva orden de compra» para armar la cabecera y el detalle."
      />

      <OrdenCompraForm
        open={formularioAbierto}
        onClose={cerrarFormulario}
        onGuardarBorrador={manejarGuardarBorrador}
        onConfirmarYEmitir={manejarConfirmarYEmitir}
        loadingBorrador={crear.isPending}
        loadingConfirmar={crear.isPending || cambiarEstado.isPending}
        error={error}
      />
    </div>
  )
}
