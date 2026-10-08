import { Power, RotateCcw } from 'lucide-react'
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog'
import type { ConfirmDialogDetail } from '@/shared/components/common/ConfirmDialog'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { useEditarPlanEjemplo } from '../hooks/usePlanesEjemplo'
import type { PlanEjemplo } from '../types/planEjemplo.types'

interface CambiarEstadoPlanModalProps {
  /** El plan a activar/inactivar. Quien lo usa monta el modal solo cuando hay uno elegido. */
  plan: PlanEjemplo
  onClose: () => void
  onCambiado: () => void
}

/**
 * Confirmación de activar/inactivar un plan de ejemplo.
 *
 * Aclara las dos cosas que el usuario no puede deducir mirando la pantalla:
 * los planes son informativos (ninguna venta queda atada a ellos), y el único
 * efecto es si el plan se ofrece como ejemplo en el catálogo público. El
 * estado comercial de la publicación no cambia, tenga los planes que tenga.
 *
 * Se monta recién cuando hay un plan elegido y se desmonta al cerrar, así el
 * estado de la mutación (error incluido) nunca sobrevive de una apertura a la
 * siguiente.
 */
export function CambiarEstadoPlanModal({ plan, onClose, onCambiado }: CambiarEstadoPlanModalProps) {
  const toast = useToast()
  const editar = useEditarPlanEjemplo()

  const inactivando = plan.estado

  function confirmar() {
    editar.mutate(
      { id: plan.id_plan_ejemplo, payload: { estado: !plan.estado } },
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

  const consecuencias: ConfirmDialogDetail[] = [
    {
      label: 'Ventas',
      value: 'no se ven afectadas: los planes de ejemplo son informativos.',
    },
    {
      label: 'Catálogo público',
      value: inactivando
        ? 'el plan deja de mostrarse como ejemplo de financiación de esta unidad.'
        : 'el plan vuelve a mostrarse como ejemplo de financiación de esta unidad.',
    },
  ]

  return (
    <ConfirmDialog
      open
      onCancel={onClose}
      onConfirm={confirmar}
      variant={inactivando ? 'baja' : 'reactivar'}
      eyebrow={inactivando ? 'Inactivar plan de ejemplo' : 'Activar plan de ejemplo'}
      eyebrowIcon={inactivando ? <Power /> : <RotateCcw />}
      title={inactivando ? `¿Inactivar "${plan.nombre}"?` : `¿Activar "${plan.nombre}"?`}
      details={consecuencias}
      note={
        inactivando ? 'El plan no se borra: se puede volver a activar más adelante.' : undefined
      }
      confirmLabel={inactivando ? 'Inactivar' : 'Activar'}
      confirmIcon={inactivando ? <Power /> : <RotateCcw />}
      loading={editar.isPending}
      error={editar.error ? formatearMensajeError(editar.error.message) : null}
    />
  )
}
