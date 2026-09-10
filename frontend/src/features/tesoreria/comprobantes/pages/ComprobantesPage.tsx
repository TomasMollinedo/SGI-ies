import { useState } from 'react'
import { Plus, Receipt } from 'lucide-react'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { ComprobanteForm } from '../components/ComprobanteForm'
import { useConfirmarComprobante, useCrearComprobante } from '../hooks/useComprobantes'
import type { ComprobanteFormOutput } from '../types/comprobante.schema'
import type { CrearComprobantePayload } from '../types/comprobante.types'
import { formatearNumeroComprobante } from '../utils/numeroComprobante'

function construirPayload(payload: ComprobanteFormOutput): CrearComprobantePayload {
  return {
    FK_tipo_comprobante: payload.FK_tipo_comprobante,
    FK_proveedor: payload.FK_proveedor,
    FK_orden_compra: payload.FK_orden_compra ? Number(payload.FK_orden_compra) : undefined,
    FK_comprobante_origen: payload.FK_comprobante_origen
      ? Number(payload.FK_comprobante_origen)
      : undefined,
    letra: payload.letra,
    punto_de_venta: payload.punto_de_venta,
    numero: payload.numero,
    fecha_emision: payload.fecha_emision,
    fecha_vencimiento: payload.fecha_vencimiento,
    observaciones: payload.observaciones || undefined,
    alicuota_iva: payload.alicuota_iva,
    detalle: payload.detalle.map((linea) => ({
      descripcion: linea.descripcion,
      FK_articulo: linea.FK_articulo ? Number(linea.FK_articulo) : undefined,
      cantidad: linea.cantidad,
      precio_unitario: linea.precio_unitario,
    })),
  }
}

/**
 * Comprobantes de proveedor (HU-16). T79 cubre el alta completa: cabecera +
 * grilla de detalle, guardar como borrador o confirmar y registrar. El listado
 * con su detalle en modo lectura y la anulación son de T80.
 */
export function ComprobantesPage() {
  const toast = useToast()
  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const [error, setError] = useState<ApiErrorResponse | null>(null)

  const crear = useCrearComprobante()
  const confirmar = useConfirmarComprobante()

  function cerrarFormulario() {
    setFormularioAbierto(false)
    setError(null)
  }

  function manejarGuardarBorrador(payload: ComprobanteFormOutput) {
    setError(null)
    crear.mutate(construirPayload(payload), {
      onSuccess: (comprobante) => {
        toast.success(
          `Comprobante ${formatearNumeroComprobante(comprobante)} guardado como borrador.`
        )
        cerrarFormulario()
      },
      onError: (error) => setError(error),
    })
  }

  // Confirmar y registrar es una creación (BORRADOR) seguida del cambio a
  // REGISTRADO: son las dos llamadas que ya expone el backend, no un endpoint
  // nuevo. Si el segundo paso falla, el borrador queda creado y se puede
  // retomar desde el listado (T80).
  function manejarConfirmar(payload: ComprobanteFormOutput) {
    setError(null)
    crear.mutate(construirPayload(payload), {
      onSuccess: (comprobante) => {
        confirmar.mutate(comprobante.id_comprobante_proveedor, {
          onSuccess: (registrado) => {
            toast.success(`Comprobante ${formatearNumeroComprobante(registrado)} registrado.`)
            cerrarFormulario()
          },
          onError: (error) => setError(error),
        })
      },
      onError: (error) => setError(error),
    })
  }

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

      <ComprobanteForm
        open={formularioAbierto}
        onClose={cerrarFormulario}
        onGuardarBorrador={manejarGuardarBorrador}
        onConfirmar={manejarConfirmar}
        loadingBorrador={crear.isPending}
        loadingConfirmar={crear.isPending || confirmar.isPending}
        error={error}
      />
    </div>
  )
}