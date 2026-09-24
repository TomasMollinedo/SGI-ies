import type { CuotaMiVenta, MiVentaDetalle } from '../types/miVenta.types'

/**
 * Si el cliente puede declarar un pago sobre esta cuota: solo PENDIENTE o
 * PARCIAL, nunca en una venta CANCELADA. El backend ya no devuelve ventas
 * canceladas en el detalle, pero se condiciona igual: es la misma regla que
 * aplica `POST /cliente/declaraciones-pago` y no cuesta nada repetirla acá.
 *
 * No mira si hay formas de pago habilitadas: eso es de toda la pantalla, no de
 * cada cuota.
 */
export function puedeDeclararCuota(
  cuota: CuotaMiVenta,
  venta: Pick<MiVentaDetalle, 'estado'>
): boolean {
  if (venta.estado === 'CANCELADA') return false
  return cuota.estado === 'PENDIENTE' || cuota.estado === 'PARCIAL'
}

/** "Anticipo" para la cuota 0, "Cuota N" para el resto — mismo criterio que el cronograma. */
export function etiquetaCuota(numero: number): string {
  return numero === 0 ? 'Anticipo' : `Cuota ${numero}`
}
