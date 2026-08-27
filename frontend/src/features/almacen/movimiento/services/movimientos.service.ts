import { httpClient } from '@/shared/api/httpClient'
import type { CrearMovimientoPayload, MovimientoCreado } from '../types/movimiento.types'

/** POST /movimientos — registra el movimiento y actualiza el stock de cada ficha del detalle. */
export async function crearMovimiento(payload: CrearMovimientoPayload): Promise<MovimientoCreado> {
  const { data } = await httpClient.post<MovimientoCreado>('/movimientos', payload)
  return data
}
