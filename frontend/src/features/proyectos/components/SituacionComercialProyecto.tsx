import { SeccionPublicacion } from '@/features/comercializacion/publicaciones/components/SeccionPublicacion'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Badge } from '@/shared/components/ui/Badge'
import { Spinner } from '@/shared/components/ui/Spinner'
import type { ProyectoFicha } from '../types/proyecto.types'
import { ESTADO_COMERCIAL_UNIDAD_META } from '../unidades-funcionales/config/unidadFuncional.config'
import type { EstadoComercialUnidad } from '../unidades-funcionales/types/unidadFuncional.types'

/** El orden en que se leen: del que todavía no salió a la venta al que ya se vendió. */
const ORDEN_ESTADOS: EstadoComercialUnidad[] = [
  'SIN_PUBLICAR',
  'EN_PREPARACION',
  'DISPONIBLE',
  'EN_PLAN_DE_PAGO',
  'VENDIDA',
]

interface SituacionComercialProyectoProps {
  /** `undefined` mientras carga o si la ficha falló. */
  ficha: ProyectoFicha | undefined
  cargando: boolean
  /** Mensaje del error de la ficha, ya formateado. */
  error: string | null
  onReintentar: () => void
}

/**
 * Situación comercial del proyecto: cuántas unidades activas hay en cada
 * estado comercial. Va en un bloque propio porque es independiente del estado
 * de obra, que está en la cabecera (HU-31).
 *
 * Es además el único lugar donde se informa que la ficha no se pudo cargar.
 */
export function SituacionComercialProyecto({
  ficha,
  cargando,
  error,
  onReintentar,
}: SituacionComercialProyectoProps) {
  return (
    <SeccionPublicacion titulo="Situación comercial">
      {cargando ? (
        <div className="flex justify-center py-6">
          <Spinner className="text-primary size-6" />
        </div>
      ) : !ficha ? (
        <ErrorState mensaje={error ?? undefined} onReintentar={onReintentar} />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-content-muted text-xs">
            Unidades activas por estado comercial. No depende del estado de obra.
          </p>

          <ul className="flex flex-wrap gap-x-6 gap-y-3">
            {ORDEN_ESTADOS.map((estado) => {
              const meta = ESTADO_COMERCIAL_UNIDAD_META[estado]
              return (
                <li key={estado} className="flex items-center gap-2">
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                  <span className="text-content text-lg font-semibold">
                    {ficha.situacion_comercial.por_estado[estado]}
                  </span>
                </li>
              )
            })}
          </ul>

          {/* Sale de `todas_vendidas` y no del porcentaje, que está redondeado. */}
          {ficha.situacion_comercial.todas_vendidas && (
            <div>
              <Badge variant="active" className="px-3 py-1.5 text-sm">
                Todas las unidades vendidas
              </Badge>
            </div>
          )}
        </div>
      )}
    </SeccionPublicacion>
  )
}
