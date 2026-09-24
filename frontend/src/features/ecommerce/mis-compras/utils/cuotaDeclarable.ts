import type { CuotaMiVenta, MiVentaDetalle } from '../types/miVenta.types'

/**
 * Si el cliente puede declarar un pago sobre esta cuota: solo PENDIENTE o
 * PARCIAL, nunca en una venta CANCELADA ni en una de contado (se paga en una
 * sola cuota, de forma presencial). Son las mismas reglas que aplica
 * `POST /cliente/declaraciones-pago`; el backend ya no devuelve ventas
 * canceladas en el detalle, pero se condiciona igual.
 *
 * Cubre tanto el botón del cronograma como el "volver a declarar" de una
 * declaración rechazada. No mira si hay formas de pago habilitadas: eso es de
 * toda la pantalla, no de cada cuota.
 */
export function puedeDeclararCuota(
  cuota: CuotaMiVenta,
  venta: Pick<MiVentaDetalle, 'estado' | 'plan'>
): boolean {
  if (esVentaDeContado(venta)) return false
  if (venta.estado === 'CANCELADA') return false
  return cuota.estado === 'PENDIENTE' || cuota.estado === 'PARCIAL'
}

/** Una venta de contado se paga en una sola cuota, de forma presencial: no admite declaraciones. */
export function esVentaDeContado(venta: Pick<MiVentaDetalle, 'plan'>): boolean {
  return venta.plan.tipo === 'CONTADO'
}

/** "Anticipo" para la cuota 0, "Cuota N" para el resto — mismo criterio que el cronograma. */
export function etiquetaCuota(numero: number): string {
  return numero === 0 ? 'Anticipo' : `Cuota ${numero}`
}
