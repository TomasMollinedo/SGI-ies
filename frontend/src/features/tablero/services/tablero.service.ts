import { listarCobros } from '@/features/tesoreria/cobranzas/services/cobros.service'
import type { ResumenPeriodoCobro } from '@/features/tesoreria/cobranzas/types/cobro.types'
import { httpClient } from '@/shared/api/httpClient'
import type {
  FiltrosTablero,
  IngresosEgresosResponse,
  MargenProyectoResponse,
} from '../types/tablero.types'

export const TABLERO_QUERY_KEYS = {
  INGRESOS_EGRESOS: (filtros: FiltrosTablero | null) =>
    ['tablero', 'ingresos-egresos', filtros] as const,
  INGRESOS_POR_CLIENTE: (filtros: FiltrosTablero | null) =>
    ['tablero', 'ingresos-por-cliente', filtros] as const,
  MARGEN_PROYECTO: ['tablero', 'margen-proyecto'] as const,
}

/**
 * GET /tablero/ingresos-egresos. El `signal` viene de React Query: al cambiar
 * los filtros, el request anterior se aborta y no puede pisar al nuevo.
 */
export async function obtenerIngresosEgresos(
  filtros: FiltrosTablero,
  signal?: AbortSignal
): Promise<IngresosEgresosResponse> {
  const { data } = await httpClient.get<IngresosEgresosResponse>('/tablero/ingresos-egresos', {
    params: {
      agrupacion: filtros.agrupacion,
      fechaDesde: filtros.fechaDesde,
      fechaHasta: filtros.fechaHasta,
      // `undefined` no viaja: sin proyecto, el backend no filtra.
      FK_proyecto: filtros.FK_proyecto,
    },
    signal,
  })

  return data
}

/**
 * GET /tablero/margen-proyecto. No lleva parámetros: el margen es a la fecha
 * (no depende del rango) y viene de todos los proyectos activos juntos. El
 * filtro por proyecto de la pantalla se aplica sobre esta respuesta, en el
 * cliente.
 */
export async function obtenerMargenProyecto(signal?: AbortSignal): Promise<MargenProyectoResponse> {
  const { data } = await httpClient.get<MargenProyectoResponse>('/tablero/margen-proyecto', {
    signal,
  })

  return data
}

/**
 * Lo cobrado a cada cliente en el rango. El tablero no lo abre, pero
 * `GET /cobros` con las dos fechas devuelve el resumen del período (total y
 * subtotal por cliente, sin los cobros anulados, calculado sobre todas las
 * páginas), así que se pide una sola fila de la lista y se usa solo el resumen.
 */
export async function obtenerIngresosPorCliente(
  filtros: FiltrosTablero,
  signal?: AbortSignal
): Promise<ResumenPeriodoCobro | null> {
  const { resumenPeriodo } = await listarCobros(
    { fechaDesde: filtros.fechaDesde, fechaHasta: filtros.fechaHasta, limit: 1 },
    signal
  )

  return resumenPeriodo
}
