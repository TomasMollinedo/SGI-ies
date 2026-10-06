import { Power, RotateCcw } from 'lucide-react'
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog'
import type { ConfirmDialogDetail } from '@/shared/components/common/ConfirmDialog'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { useEditarPlanPago } from '../hooks/usePlanesPago'
import type { PlanPago } from '../types/planPago.types'

interface CambiarEstadoPlanModalProps {
  /** El plan a activar/inactivar. Quien lo usa monta el modal solo cuando hay uno elegido. */
  plan: PlanPago
  onClose: () => void
  onCambiado: () => void
}

/**
 * Confirmación de activar/inactivar un plan.
 *
 * Al inactivar explica las dos consecuencias, que son las que el usuario no
 * puede deducir mirando la pantalla:
 *
 * 1. Las adhesiones (ventas) ya confirmadas sobre este plan no se tocan.
 * 2. Si era el único plan activo, la publicación vuelve a "En preparación" y
 *    la unidad deja de verse en el catálogo público.
 *
 * La segunda se muestra siempre, sin averiguar antes si es el único activo: es
 * información correcta en cualquier caso —si hay otros planes activos
 * simplemente no aplica—, y consultarlo de antemano agregaría una condición de
 * carrera (otro usuario puede inactivar el otro plan en el medio) sin cambiar
 * lo que el usuario necesita saber.
 *
 * Se monta recién cuando hay un plan elegido y se desmonta al cerrar, así el
 * estado de la mutación (error incluido) nunca sobrevive de una apertura a la
 * siguiente.
 *
 * El PATCH devuelve el plan, no la publicación: el `estado_comercial` que se
 * muestra arriba se relee del detalle de la publicación, que la mutación
 * invalida (ver `usePlanesPago`).
 */
export function CambiarEstadoPlanModal({ plan, onClose, onCambiado }: CambiarEstadoPlanModalProps) {
  const toast = useToast()
  const editar = useEditarPlanPago()

  const inactivando = plan.estado

  function confirmar() {
    editar.mutate(
      { id: plan.id_plan_pago, payload: { estado: !plan.estado } },
      {
        onSuccess: (actualizado) => {
          toast.success(
            actualizado.estado
              ? `Plan "${plan.nombre}" activado.`
              : `Plan "${plan.nombre}" inactivado.`
          )
          onCambiado()
        },
      }
    )
  }

  const consecuencias: ConfirmDialogDetail[] = inactivando
    ? [
        {
          label: 'Ventas ya confirmadas',
          value: 'no se ven afectadas: las adhesiones hechas sobre este plan siguen vigentes.',
        },
        {
          label: 'Catálogo público',
          value:
            'si este era el único plan activo, la unidad vuelve a "En preparación" y deja de verse públicamente.',
        },
      ]
    : [
        {
          label: 'Catálogo público',
          value:
            'si la publicación estaba en "En preparación", vuelve a verse como disponible en cuanto este plan quede activo.',
        },
      ]

  return (
    <ConfirmDialog
      open
      onCancel={onClose}
      onConfirm={confirmar}
      variant={inactivando ? 'baja' : 'reactivar'}
      eyebrow={inactivando ? 'Inactivar plan de pago' : 'Activar plan de pago'}
      eyebrowIcon={inactivando ? <Power /> : <RotateCcw />}
      title={inactivando ? `¿Inactivar "${plan.nombre}"?` : `¿Activar "${plan.nombre}"?`}
      details={consecuencias}
      note={
        inactivando
          ? 'El plan deja de ofrecerse, pero no se borra: se puede volver a activar más adelante.'
          : undefined
      }
      confirmLabel={inactivando ? 'Inactivar' : 'Activar'}
      confirmIcon={inactivando ? <Power /> : <RotateCcw />}
      loading={editar.isPending}
      error={editar.error ? formatearMensajeError(editar.error.message) : null}
    />
  )
}
