import { ArrowLeft, ShoppingCart } from 'lucide-react'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { formatearImporte } from '@/shared/utils/importe'
import {
  PERIODICIDAD_LABEL,
  TIPO_PLAN_LABEL,
} from '@/features/comercializacion/planes-pago/config/planPago.config'
import type { PlanPago } from '@/features/comercializacion/planes-pago/types/planPago.types'
import { aNumeroOCero } from '@/features/comercializacion/planes-pago/utils/decimal'
import type { PublicacionListItem } from '@/features/comercializacion/publicaciones/types/publicacion.types'
import { AlertaInline } from '@/features/comercializacion/publicaciones/components/AlertaInline'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { useCrearVenta } from '../hooks/useVentas'
import type { ClienteVenta, VentaDetalle } from '../types/venta.types'
import { clasificarRechazoVenta } from '../utils/clasificarRechazoVenta'

interface ConfirmarVentaModalProps {
  open: boolean
  unidad: PublicacionListItem
  plan: PlanPago
  cliente: ClienteVenta
  onClose: () => void
  onVolverAUnidad: () => void
  onVolverAPlan: () => void
  onVentaRegistrada: (venta: VentaDetalle) => void
}

/**
 * Paso final de la venta (HU-27): resume unidad, precio, plan, anticipo y
 * cuotas — criterio literal de la HU — antes de llamar `POST /ventas`.
 *
 * Los 409 del backend son accionables: según `clasificarRechazoVenta`, se
 * ofrece volver a elegir unidad o plan en vez de un error genérico. Mismo
 * patrón que `PublicarUnidadModal` (selección → confirmación, con
 * `AlertaInline` persistente para el rechazo).
 */
export function ConfirmarVentaModal({
  open,
  unidad,
  plan,
  cliente,
  onClose,
  onVolverAUnidad,
  onVolverAPlan,
  onVentaRegistrada,
}: ConfirmarVentaModalProps) {
  const crear = useCrearVenta()

  function confirmar() {
    crear.mutate(
      {
        cliente,
        FK_publicacion: unidad.id_publicacion,
        FK_plan_pago: plan.id_plan_pago,
      },
      { onSuccess: onVentaRegistrada }
    )
  }

  const rechazo = crear.isError ? crear.error : null
  const mensajeRechazo = rechazo ? formatearMensajeError(rechazo.message) : null
  const accion = mensajeRechazo ? clasificarRechazoVenta(mensajeRechazo) : 'NINGUNA'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirmar venta"
      icon={<ShoppingCart />}
      size="sm"
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
        <dl className="text-sm">
          <Fila etiqueta="Unidad" valor={unidad.unidad.identificador} />
          <Fila etiqueta="Proyecto" valor={unidad.proyecto.nombre} />
          <Fila
            etiqueta="Cliente"
            valor={`${cliente.nombre}${cliente.apellido ? ` ${cliente.apellido}` : ''}`}
          />
          <Fila etiqueta="Plan" valor={`${plan.nombre} (${TIPO_PLAN_LABEL[plan.tipo]})`} />
          <Fila etiqueta="Precio" valor={formatearImporte(aNumeroOCero(plan.precio))} />
          <Fila etiqueta="Anticipo" valor={textoAnticipo(plan)} />
          {plan.tipo === 'FINANCIADO' && (
            <Fila
              etiqueta="Cuotas"
              valor={`${plan.cantidad_cuotas ?? '—'}${
                plan.periodicidad ? ` · ${PERIODICIDAD_LABEL[plan.periodicidad]}` : ''
              }`}
            />
          )}
        </dl>

        {mensajeRechazo && (
          <AlertaInline>
            <p>{mensajeRechazo}</p>

            {accion === 'ELEGIR_OTRA_UNIDAD' && (
              <Button size="sm" variant="error" icon={<ArrowLeft />} onClick={onVolverAUnidad}>
                Volver a elegir unidad
              </Button>
            )}
            {accion === 'ELEGIR_OTRO_PLAN' && (
              <Button size="sm" variant="error" icon={<ArrowLeft />} onClick={onVolverAPlan}>
                Volver a elegir plan
              </Button>
            )}
          </AlertaInline>
        )}
      </div>
    </Modal>
  )
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="mb-2">
      <dt className="text-content-muted text-xs">{etiqueta}</dt>
      <dd className="text-content font-medium break-words">{valor}</dd>
    </div>
  )
}

function textoAnticipo(plan: PlanPago): string {
  if (plan.anticipo_porcentaje !== null) {
    return `${plan.anticipo_porcentaje}%`
  }
  return plan.anticipo_monto !== null ? formatearImporte(aNumeroOCero(plan.anticipo_monto)) : '—'
}
