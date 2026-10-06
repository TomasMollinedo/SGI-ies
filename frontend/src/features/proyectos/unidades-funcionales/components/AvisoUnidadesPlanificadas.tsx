import { TriangleAlert } from 'lucide-react'

interface AvisoUnidadesPlanificadasProps {
  cargadas: number
  planificadas: number
}

/**
 * Aviso de que el proyecto ya no admite más unidades: con las cargadas igual a
 * las planificadas (o por encima, si se bajó la cantidad después), el backend
 * rechaza altas y reactivaciones. Se anticipa acá para que el usuario sepa que
 * el paso previo es actualizar la cantidad en el proyecto. No reemplaza la
 * validación del backend, que igual rechaza con un 409.
 */
export function AvisoUnidadesPlanificadas({
  cargadas,
  planificadas,
}: AvisoUnidadesPlanificadasProps) {
  if (cargadas < planificadas) return null

  return (
    <div
      role="alert"
      className="border-warning/30 bg-warning-soft text-warning flex items-start gap-2 rounded-md border px-4 py-3 text-xs"
    >
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p>
        El proyecto ya tiene {cargadas} {cargadas === 1 ? 'unidad activa' : 'unidades activas'} de{' '}
        {planificadas} {planificadas === 1 ? 'planificada' : 'planificadas'}. Para cargar más
        unidades, primero hay que actualizar la cantidad de unidades planificadas en el proyecto.
      </p>
    </div>
  )
}
