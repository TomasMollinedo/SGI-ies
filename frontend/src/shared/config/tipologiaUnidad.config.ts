import type { SelectOption } from '@/shared/components/ui/Select'
import type { TipologiaUnidad } from '@/shared/types/unidadFuncional.types'

export const TIPOLOGIA_LABEL: Record<TipologiaUnidad, string> = {
  MONOAMBIENTE: 'Monoambiente',
  UN_DORMITORIO: '1 dormitorio',
  DOS_DORMITORIOS: '2 dormitorios',
  TRES_DORMITORIOS: '3 dormitorios',
  LOCAL_COMERCIAL: 'Local comercial',
  COCHERA: 'Cochera',
  OTRO: 'Otro',
}

/** Opciones del `<Select>` de tipología. `''` = todas. */
export const OPCIONES_TIPOLOGIA: SelectOption[] = [
  { value: '', label: 'Todas las tipologías' },
  ...(Object.entries(TIPOLOGIA_LABEL) as [TipologiaUnidad, string][]).map(([value, label]) => ({
    value,
    label,
  })),
]

export function esTipologia(valor: string): valor is TipologiaUnidad {
  return valor in TIPOLOGIA_LABEL
}
