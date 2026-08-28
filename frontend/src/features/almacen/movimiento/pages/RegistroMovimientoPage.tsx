import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { MovimientoForm } from '../components/MovimientoForm'
import { useCrearMovimiento } from '../hooks/useMovimientos'
import type { MovimientoFormOutput } from '../types/movimiento.schema'

/**
 * Host provisorio del modal de registro de movimientos (T-07.3), sin tabla ni
 * filtros: eso es el historial de movimientos (T-07.4), a cargo de otra
 * persona, que va a reemplazar esta página.
 */
export function RegistroMovimientoPage() {
  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const toast = useToast()
  const crear = useCrearMovimiento()

  function manejarSubmit(payload: MovimientoFormOutput) {
    crear.mutate(
      {
        FK_TipoMovimiento: payload.FK_TipoMovimiento,
        FK_Deposito: payload.FK_Deposito,
        referencia: payload.referencia || undefined,
        observaciones: payload.observaciones || undefined,
        detalle: payload.detalle.map((linea) => ({
          FK_Stock: linea.FK_Stock,
          cantidad: linea.cantidad,
          observacion: linea.observacion || undefined,
        })),
      },
      {
        onSuccess: (movimiento) => {
          toast.success(`Movimiento N.º ${movimiento.id_movimiento} registrado correctamente.`)
          setFormularioAbierto(false)
        },
        onError: (error) => toast.error(formatearMensajeError(error.message)),
      }
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button icon={<Plus />} onClick={() => setFormularioAbierto(true)}>
          Nuevo movimiento
        </Button>
      </div>

      <MovimientoForm
        open={formularioAbierto}
        onClose={() => setFormularioAbierto(false)}
        onSubmit={manejarSubmit}
        loading={crear.isPending}
      />
    </div>
  )
}
