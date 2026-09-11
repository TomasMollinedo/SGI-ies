const MS_POR_DIA = 1000 * 60 * 60 * 24;

/**
 * Días de calendario entre "hoy" y el vencimiento, normalizando ambas fechas
 * a medianoche UTC antes de restar (para contar días completos, no
 * fracciones de horas). Vence hoy todavía no es "vencido" (recién lo es al
 * día siguiente) — por eso `dias > 0`, no `>= 0`. No vencido da
 * `dias_vencido: 0`.
 *
 * Repetido igual en Pago (comprobantes imputables) y en el extracto de
 * Cuenta Corriente, se extrae acá en vez de reescribirlo en cada uno.
 */
export function calcularDiasVencido(fechaVencimiento: Date, hoy: Date) {
  const vencimientoUTC = Date.UTC(
    fechaVencimiento.getUTCFullYear(),
    fechaVencimiento.getUTCMonth(),
    fechaVencimiento.getUTCDate(),
  );
  const hoyUTC = Date.UTC(
    hoy.getUTCFullYear(),
    hoy.getUTCMonth(),
    hoy.getUTCDate(),
  );

  const dias = Math.round((hoyUTC - vencimientoUTC) / MS_POR_DIA);

  return {
    vencido: dias > 0,
    dias_vencido: dias > 0 ? dias : 0,
  };
}
