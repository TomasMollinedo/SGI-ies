import {
  OFFSET_ARGENTINA_ISO,
  OFFSET_ARGENTINA_MS,
} from '../src/common/validaciones/offset-argentina';

/**
 * Helper de fechas compartido por los seeds. No es un seed: no se ejecuta
 * solo.
 *
 * Las fechas de negocio se siembran ancladas a la medianoche de Argentina,
 * igual que las guarda la API (`fechaIsoSchema`). `new Date('AAAA-MM-DD')`
 * las deja a la medianoche UTC, 3 horas antes: con esa diferencia dos fechas
 * del mismo día pueden quedar cruzadas (detectado en T123).
 */

/** `'AAAA-MM-DD'` → medianoche de ese día en Argentina. */
export function fechaArgentina(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000${OFFSET_ARGENTINA_ISO}`);
}

/**
 * Medianoche de Argentina de hoy más `dias` días de calendario (negativo =
 * hacia atrás). Para que las cuotas vencidas, los cobros del año en curso y
 * los vencimientos a futuro sigan teniendo sentido el día que se corra el
 * seed, en vez de fechas fijas que con el tiempo cambian de significado.
 */
export function diasDesdeHoy(dias: number): Date {
  // Sumar el offset deja en los campos UTC la fecha local de Argentina.
  const hoy = new Date(Date.now() + OFFSET_ARGENTINA_MS);
  const objetivo = new Date(
    Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() + dias),
  );
  return fechaArgentina(objetivo.toISOString().slice(0, 10));
}

/**
 * Medianoche de Argentina del mismo día de hoy, `meses` meses atrás o
 * adelante. Si ese día no existe en el mes destino, el último del mes (misma
 * regla que los vencimientos de `motor-cuotas.ts`).
 */
export function mesesDesdeHoy(meses: number): Date {
  const hoy = new Date(Date.now() + OFFSET_ARGENTINA_MS);
  const anio = hoy.getUTCFullYear();
  const mes = hoy.getUTCMonth() + meses;
  const ultimoDia = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  const objetivo = new Date(
    Date.UTC(anio, mes, Math.min(hoy.getUTCDate(), ultimoDia)),
  );
  return fechaArgentina(objetivo.toISOString().slice(0, 10));
}
