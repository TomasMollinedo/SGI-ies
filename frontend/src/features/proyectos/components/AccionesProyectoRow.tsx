import { Eye, Pencil, Trash2 } from 'lucide-react'
import { IconButton } from '@/shared/components/ui/IconButton'
import type { ProyectoResumen } from '../types/proyecto.types'
import { esProyectoModificable, motivoNoSePuedeDarDeBaja } from '../utils/reglasProyecto'

interface AccionesProyectoRowProps {
  proyecto: ProyectoResumen
  onVer: () => void
  onEditar: () => void
  onDarDeBaja: () => void
  /** La baja de esta fila está en curso: su botón muestra el spinner. */
  dandoDeBaja?: boolean
}

/**
 * Acciones de la fila del listado de proyectos. No usa `RowActions` porque la
 * baja tiene condiciones propias (HU-31) y, cuando no se cumplen, el botón se
 * muestra deshabilitado con el motivo:
 * - Ver: siempre.
 * - Editar: solo si el proyecto está activo y no Cancelado.
 * - Dar de baja: solo en proyectos activos; habilitada si está En
 *   planificación y sin unidades cargadas. No hay reactivación.
 */
export function AccionesProyectoRow({
  proyecto,
  onVer,
  onEditar,
  onDarDeBaja,
  dandoDeBaja = false,
}: AccionesProyectoRowProps) {
  const motivoSinBaja = proyecto.estado ? motivoNoSePuedeDarDeBaja(proyecto) : null

  return (
    <div className="inline-flex items-center gap-1">
      <IconButton
        icon={<Eye />}
        ariaLabel="Ver detalle"
        variant="soft"
        size="sm"
        bgColor="fondo-ver"
        iconColor="info"
        onClick={onVer}
      />

      {esProyectoModificable(proyecto) && (
        <IconButton
          icon={<Pencil />}
          ariaLabel="Editar registro"
          variant="soft"
          size="sm"
          bgColor="fondo-editar"
          iconColor="warning"
          onClick={onEditar}
        />
      )}

      {proyecto.estado &&
        (motivoSinBaja ? (
          // El `title` va en el `<span>`: un `<button disabled>` no dispara el
          // hover, así que el tooltip no aparecería. El motivo también viaja en
          // el `aria-label`, para quien no ve el tooltip.
          <span title={motivoSinBaja} className="inline-flex">
            <IconButton
              icon={<Trash2 />}
              ariaLabel={`Dar de baja (no disponible: ${motivoSinBaja})`}
              variant="soft"
              size="sm"
              bgColor="fondo-eliminar"
              iconColor="error"
              disabled
            />
          </span>
        ) : (
          <IconButton
            icon={<Trash2 />}
            ariaLabel="Dar de baja"
            variant="soft"
            size="sm"
            bgColor="fondo-eliminar"
            iconColor="error"
            loading={dandoDeBaja}
            onClick={onDarDeBaja}
          />
        ))}
    </div>
  )
}
