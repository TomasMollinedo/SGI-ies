import { OFFSET_ARGENTINA_MS } from './offset-argentina';

const MS_POR_DIA = 1000 * 60 * 60 * 24;

/**
 * Días de calendario entre "hoy" y el vencimiento, restando días completos
 * (no fracciones de horas). Vence hoy todavía no es "vencido" (recién lo es
 * al día siguiente) — por eso `dias > 0`, no `>= 0`. No vencido da
 * `dias_vencido: 0`.
 *
 * Cada lado toma su día calendario con un criterio distinto, a propósito:
 * - Vencimiento: la parte `YYYY-MM-DD` en UTC, que es la convención del
 *   proyecto para fechas de negocio (igual que `formatearFechaSinHora` y
 *   `esVencido` en el frontend). Da el día correcto tanto para las fechas
 *   ancladas a la medianoche de Argentina (03:00Z, lo que guarda
 *   `fechaIsoSchema`) como para las del seed (`new Date('2026-04-14')`,
 *   00:00Z). Pasarlo a hora argentina correría el seed un día para atrás.
 * - Hoy: el día calendario de Argentina. Entre las 21:00 y las 24:00 de
 *   Argentina el día UTC ya es el siguiente, y tomarlo en UTC daba por
 *   vencido, con un día de atraso, algo que vence hoy.
 *
 * Repetido igual en Pago (comprobantes imputables), en el extracto de
 * Cuenta Corriente y en Cobro, se extrae acá en vez de reescribirlo en cada
 * uno.
 */
export function calcularDiasVencido(fechaVencimiento: Date, hoy: Date) {
  const vencimientoUTC = Date.UTC(
    fechaVencimiento.getUTCFullYear(),
    fechaVencimiento.getUTCMonth(),
    fechaVencimiento.getUTCDate(),
  );
  // Correr el instante por el offset deja en los campos UTC la fecha y hora
  // de pared de Argentina.
  const hoyArgentina = new Date(hoy.getTime() + OFFSET_ARGENTINA_MS);
  const hoyUTC = Date.UTC(
    hoyArgentina.getUTCFullYear(),
    hoyArgentina.getUTCMonth(),
    hoyArgentina.getUTCDate(),
  );

  const dias = Math.round((hoyUTC - vencimientoUTC) / MS_POR_DIA);

  return {
    vencido: dias > 0,
    dias_vencido: dias > 0 ? dias : 0,
  };
}
