import type { ReactNode } from 'react'
import { Badge } from '@/shared/components/ui/Badge'
import { ESTADO_PROYECTO_BADGE, ESTADO_PROYECTO_LABEL } from '../config/proyecto.config'
import type { ProyectoResumen } from '../types/proyecto.types'

interface CabeceraProyectoProps {
  titulo: string
  /** Sin proyecto (alta) solo se muestra el título. */
  proyecto?: Pick<ProyectoResumen, 'codigo' | 'localidad' | 'estado' | 'estado_obra'>
  /** Botones de la pantalla, alineados a la derecha. */
  acciones?: ReactNode
  /** Contenido extra debajo (ej. por qué una acción está deshabilitada). */
  children?: ReactNode
}

/**
 * Cabecera de las pantallas de un proyecto (alta, edición y detalle): título,
 * código, y el estado de obra y la baja lógica bien visibles y por separado,
 * porque son independientes.
 */
export function CabeceraProyecto({ titulo, proyecto, acciones, children }: CabeceraProyectoProps) {
  return (
    <section
      aria-label="Cabecera del proyecto"
      className="bg-fondotabla border-subtle flex flex-col gap-3 rounded-lg border p-4 shadow-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-content text-lg font-semibold wrap-anywhere">{titulo}</h1>
          {proyecto && (
            <>
              <p className="text-content-muted text-sm wrap-anywhere">
                {proyecto.codigo} · {proyecto.localidad}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={ESTADO_PROYECTO_BADGE[proyecto.estado_obra]}>
                  {ESTADO_PROYECTO_LABEL[proyecto.estado_obra]}
                </Badge>
                <Badge variant={proyecto.estado ? 'active' : 'inactive'}>
                  {proyecto.estado ? 'Activo' : 'Dado de baja'}
                </Badge>
              </div>
            </>
          )}
        </div>

        {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
      </div>

      {children}
    </section>
  )
}
