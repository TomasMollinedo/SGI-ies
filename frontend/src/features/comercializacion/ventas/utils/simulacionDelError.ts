import type { SimulacionVenta } from '../types/venta.types'

/**
 * El 409 de `POST /ventas` por cambio de precio o de TNA (HU-27) adjunta la
 * simulación recalculada en `datos.simulacion` (`venta.service.ts`,
 * `validarSinCambiosDesdeLaSimulacion`), para volver a acordarla sin que el
 * cliente tenga que pedirla de nuevo. `datos` es `unknown` porque no todos
 * los errores del backend lo llevan: acá se valida la forma mínima antes de
 * confiar en él.
 */
export function simulacionDelError(datos: unknown): SimulacionVenta | null {
  if (typeof datos !== 'object' || datos === null || !('simulacion' in datos)) return null

  const simulacion = (datos as { simulacion: unknown }).simulacion
  if (typeof simulacion !== 'object' || simulacion === null || !('cuotas' in simulacion)) {
    return null
  }

  return simulacion as SimulacionVenta
}
