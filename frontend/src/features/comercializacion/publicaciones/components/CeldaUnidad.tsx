import { TIPOLOGIA_LABEL } from '@/shared/config/tipologiaUnidad.config'
import type { TipologiaUnidad } from '@/shared/types/unidadFuncional.types'

interface CeldaUnidadProps {
  identificador: string
  proyecto: string
  tipologia: TipologiaUnidad
}

/**
 * Celda "Unidad" del listado y de la tabla emergente: el identificador y, en
 * texto secundario debajo, proyecto y tipología. Junta tres datos en una
 * columna para que la tabla entre en mobile sin scroll horizontal.
 */
export function CeldaUnidad({ identificador, proyecto, tipologia }: CeldaUnidadProps) {
  return (
    <div className="min-w-0">
      <p className="text-content font-medium wrap-anywhere">{identificador}</p>
      <p className="text-content-muted text-xs wrap-anywhere">{proyecto}</p>
      <p className="text-content-muted text-xs wrap-anywhere">{TIPOLOGIA_LABEL[tipologia]}</p>
    </div>
  )
}
