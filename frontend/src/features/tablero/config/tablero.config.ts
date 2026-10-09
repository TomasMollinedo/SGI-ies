import type { SelectOption } from '@/shared/components/ui/Select'
import type { Agrupacion } from '../types/tablero.types'

export const OPCIONES_AGRUPACION: SelectOption[] = [
  { value: 'MENSUAL', label: 'Mensual' },
  { value: 'TRIMESTRAL', label: 'Trimestral' },
  { value: 'ANUAL', label: 'Anual' },
]

export const AGRUPACION_INICIAL: Agrupacion = 'MENSUAL'

/** Cuántos proyectos y cuántos clientes muestran los rankings. */
export const TOP_RANKING = 5

/** Proyectos por página en la tabla de margen. La paginación la resuelve el backend. */
export const MARGEN_PROYECTOS_POR_PAGINA = 5
