import { listarCobros } from '@/features/tesoreria/cobranzas/services/cobros.service'
import type { ResumenPeriodoCobro } from '@/features/tesoreria/cobranzas/types/cobro.types'
import { httpClient } from '@/shared/api/httpClient'
import type { FiltrosTablero, IngresosEgresosResponse } from '../types/tablero.types'

export const TABLERO_QUERY_KEYS = {
  INGRESOS_EGRESOS: (filtros: FiltrosTablero | null) =>
    ['tablero', 'ingresos-egresos', filtros] as const,
  INGRESOS_POR_CLIENTE: (filtros: FiltrosTablero | null) =>
    ['tablero', 'ingresos-por-cliente', filtros] as const,
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
    },
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
