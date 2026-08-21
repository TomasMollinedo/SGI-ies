import { Eye, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { IconButton } from '@/shared/components/IconButton'
import { cn } from '@/shared/utils/cn'

export type RowAction = 'view' | 'edit' | 'delete' | 'reactivate'

interface RowActionsProps {
  isActive: boolean
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onReactivate?: () => void
  loadingAction?: RowAction
  className?: string
}

/**
 * Grupo de acciones de la última columna de las tablas (artículos, marcas,
 * categorías, unidades de medida).
 *
 * Al revés que `IconButton`, este componente sí tiene los íconos y los colores
 * fijos, porque son siempre los mismos en todo el sistema.
 *
 * Props:
 * - `isActive`: si es `true` muestra ver + editar + eliminar; si es `false`,
 *   ver + editar + reactivar. Eliminar y reactivar son excluyentes y nunca se
 *   ven juntas: la decisión vive acá adentro, no en cada pantalla.
 * - `onView`, `onEdit`, `onDelete`, `onReactivate`: los handlers. Si alguno no
 *   se pasa, esa acción no se renderiza — así se resuelven después los permisos
 *   por rol sin tocar este componente.
 * - `loadingAction`: cuál de las acciones está procesando. Ese botón muestra un
 *   spinner y queda bloqueado; los demás siguen activos.
 * - `className`: clases extra para el contenedor.
 */
export function RowActions({
  isActive,
  onView,
  onEdit,
  onDelete,
  onReactivate,
  loadingAction,
  className,
}: RowActionsProps) {
  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      {onView && (
        <IconButton
          icon={<Eye />}
          ariaLabel="Ver detalle"
          variant="soft"
          size="sm"
          bgColor="fondo-ver"
          iconColor="info"
          loading={loadingAction === 'view'}
          onClick={onView}
        />
      )}

      {onEdit && (
        <IconButton
          icon={<Pencil />}
          ariaLabel="Editar registro"
          variant="soft"
          size="sm"
          bgColor="fondo-editar"
          iconColor="warning"
          loading={loadingAction === 'edit'}
          onClick={onEdit}
        />
      )}

      {isActive
        ? onDelete && (
            <IconButton
              icon={<Trash2 />}
              ariaLabel="Dar de baja"
              variant="soft"
              size="sm"
              bgColor="fondo-eliminar"
              iconColor="error"
              loading={loadingAction === 'delete'}
              onClick={onDelete}
            />
          )
        : onReactivate && (
            <IconButton
              icon={<RotateCcw />}
              ariaLabel="Reactivar"
              variant="soft"
              size="sm"
              bgColor="fondo-reactivar"
              iconColor="reactivar"
              loading={loadingAction === 'reactivate'}
              onClick={onReactivate}
            />
          )}
    </div>
  )
}
