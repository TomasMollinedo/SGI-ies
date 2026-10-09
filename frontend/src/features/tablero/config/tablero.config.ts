import type { SelectOption } from '@/shared/components/ui/Select'
import type { Agrupacion } from '../types/tablero.types'

export const OPCIONES_AGRUPACION: SelectOption[] = [
  { value: 'MENSUAL', label: 'Mensual' },
  { value: 'TRIMESTRAL', label: 'Trimestral' },
  { value: 'ANUAL', label: 'Anual' },
]

export const AGRUPACION_INICIAL: Agrupacion = 'MENSUAL'

/** Cantidad máxima de proyectos con porción propia en la torta; el resto se junta en "Otros". */
export const MAX_PORCIONES_PROYECTOS = 6

export const NOMBRE_OTROS_PROYECTOS = 'Otros proyectos'
