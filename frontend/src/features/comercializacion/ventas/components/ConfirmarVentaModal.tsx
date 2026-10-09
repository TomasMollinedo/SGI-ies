import { useEffect, useState } from 'react'
import { ArrowLeft, ShoppingCart } from 'lucide-react'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { formatearMensajeError } from '@/shared/utils/apiError'
import type { PublicacionListItem } from '@/features/comercializacion/publicaciones/types/publicacion.types'
import { AlertaInline } from '@/features/comercializacion/publicaciones/components/AlertaInline'
import { useCrearVenta } from '../hooks/useVentas'
import type {
  ClienteVenta,
  CondicionesVenta,
  CrearVentaPayload,
  SimulacionVenta,
  VentaDetalle,
} from '../types/venta.types'
import { clasificarRechazoVenta } from '../utils/clasificarRechazoVenta'
import { simulacionDelError } from '../utils/simulacionDelError'
import { ResultadoSimulacionVenta } from './ResultadoSimulacionVenta'

interface ConfirmarVentaModalProps {
  open: boolean
  unidad: PublicacionListItem
  cliente: ClienteVenta
  /** Las condiciones y la última simulación válida del panel, al momento de abrir este modal. */
  condiciones: CondicionesVenta
  simulacion: SimulacionVenta
  onClose: () => void
  onVolverAUnidad: () => void
  onVentaRegistrada: (venta: VentaDetalle) => void
}

/**
 * Paso final de la venta (HU-27): resume unidad, cliente y la simulación
 * acordada, antes de llamar `POST /ventas`.
 *
 * Si el precio de lista o la TNA del plazo cambiaron desde que se simuló, el
 * backend rechaza con 409 y la simulación recalculada (`datos.simulacion`):
 * acá se reemplaza la que se venía mostrando por esa, para volver a
 * acordarla con el cliente y confirmar de nuevo — sin salir de este modal.
 * El resto de los rechazos (unidad ya no disponible, etc.) son los mismos de
 * siempre: mensaje y, si aplica, volver a elegir unidad.
 */
export function ConfirmarVentaModal({
  open,
  unidad,
  cliente,
  condiciones,
  simulacion: simulacionInicial,
  onClose,
  onVolverAUnidad,
  onVentaRegistrada,
}: ConfirmarVentaModalProps) {
  const crear = useCrearVenta()
  const [simulacion, setSimulacion] = useState(simulacionInicial)

  // Cada apertura parte de la simulación vigente del panel, no de una vieja
  // que haya quedado de un intento de confirmación anterior.
  useEffect(() => {
    if (open) setSimulacion(simulacionInicial)
  }, [open, simulacionInicial])

  function confirmar() {
    const payload: CrearVentaPayload = {
      ...condiciones,
      cliente,
      simulacion: {
        precio_lista: Number(simulacion.precio_lista),
        tasa_nominal_anual: simulacion.plazo ? Number(simulacion.plazo.tasa_nominal_anual) : null,
      },
    }

    crear.mutate(payload, {
      onSuccess: onVentaRegistrada,
      onError: (error) => {
        const recalculada = simulacionDelError(error.datos)
        if (recalculada) setSimulacion(recalculada)
      },
    })
  }

  const rechazo = crear.isError ? crear.error : null
  const mensajeRechazo = rechazo ? formatearMensajeError(rechazo.message) : null
  const huboRecalculo = rechazo ? simulacionDelError(rechazo.datos) !== null : false
  const accion =
    mensajeRechazo && !huboRecalculo ? clasificarRechazoVenta(mensajeRechazo) : 'NINGUNA'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirmar venta"
      icon={<ShoppingCart />}
      size="xl"
      closeOnEscape={!crear.isPending}
      closeOnOverlayClick={!crear.isPending}
      footer={
        <>
          <Button variant="error" icon={<ArrowLeft />} onClick={onClose} disabled={crear.isPending}>
            Cancelar
          </Button>
          <Button
            variant="success"
            icon={<ShoppingCart />}
            onClick={confirmar}
            loading={crear.isPending}
            disabled={crear.isPending}
          >
            Confirmar venta
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Fila etiqueta="Unidad" valor={unidad.unidad.identificador} />
          <Fila etiqueta="Proyecto" valor={unidad.proyecto.nombre} />
          <Fila
            etiqueta="Cliente"
            valor={`${cliente.nombre}${cliente.apellido ? ` ${cliente.apellido}` : ''}`}
          />
        </dl>

        {mensajeRechazo && (
          <AlertaInline>
            <p>
              {huboRecalculo
                ? 'Cambió el precio o la tasa desde que se simuló: revisá los valores recalculados debajo con el cliente antes de confirmar de nuevo.'
                : mensajeRechazo}
            </p>

            {accion === 'ELEGIR_OTRA_UNIDAD' && (
              <Button size="sm" variant="error" icon={<ArrowLeft />} onClick={onVolverAUnidad}>
                Volver a elegir unidad
              </Button>
            )}
          </AlertaInline>
        )}

        <ResultadoSimulacionVenta simulacion={simulacion} />
      </div>
    </Modal>
  )
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-content-muted text-xs">{etiqueta}</dt>
      <dd className="text-content font-medium wrap-break-word">{valor}</dd>
    </div>
  )
}
