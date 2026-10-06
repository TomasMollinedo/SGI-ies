import { calcularDiasVencido } from './dias-vencido';

describe('calcularDiasVencido', () => {
  // Vencimientos guardados como los guarda el backend: medianoche de
  // Argentina (03:00Z), que es lo que produce `fechaIsoSchema`.
  const VENCE_23_09 = new Date('2026-09-23T03:00:00.000Z');
  const VENCE_22_09 = new Date('2026-09-22T03:00:00.000Z');

  it('vence hoy, consultado a las 10:00 de Argentina: todavía no está vencido', () => {
    const hoy = new Date('2026-09-23T13:00:00.000Z'); // 10:00 AR del 23/09

    expect(calcularDiasVencido(VENCE_23_09, hoy)).toEqual({
      vencido: false,
      dias_vencido: 0,
    });
  });

  it('vence hoy, consultado a las 22:30 de Argentina (el día UTC ya es mañana): todavía no está vencido', () => {
    const hoy = new Date('2026-09-24T01:30:00.000Z'); // 22:30 AR del 23/09

    expect(calcularDiasVencido(VENCE_23_09, hoy)).toEqual({
      vencido: false,
      dias_vencido: 0,
    });
  });

  it('venció ayer, consultado a las 22:30 de Argentina: 1 día de atraso', () => {
    const hoy = new Date('2026-09-24T01:30:00.000Z'); // 22:30 AR del 23/09

    expect(calcularDiasVencido(VENCE_22_09, hoy)).toEqual({
      vencido: true,
      dias_vencido: 1,
    });
  });

  it('el mismo vencimiento guardado a 00:00Z (seed) o a 03:00Z (real) da el mismo resultado', () => {
    const vencimientoSeed = new Date('2026-09-22'); // 00:00Z
    const vencimientoReal = new Date('2026-09-22T03:00:00.000Z');

    for (const hoy of [
      new Date('2026-09-22T13:00:00.000Z'), // 10:00 AR del 22/09 (vence hoy)
      new Date('2026-09-23T01:30:00.000Z'), // 22:30 AR del 22/09 (vence hoy)
      new Date('2026-09-24T01:30:00.000Z'), // 22:30 AR del 23/09 (1 día)
    ]) {
      expect(calcularDiasVencido(vencimientoSeed, hoy)).toEqual(
        calcularDiasVencido(vencimientoReal, hoy),
      );
    }
    expect(
      calcularDiasVencido(
        vencimientoSeed,
        new Date('2026-09-24T01:30:00.000Z'),
      ),
    ).toEqual({ vencido: true, dias_vencido: 1 });
  });

  it('vencimiento futuro: no vencido, 0 días', () => {
    const hoy = new Date('2026-09-20T15:00:00.000Z');

    expect(calcularDiasVencido(VENCE_23_09, hoy)).toEqual({
      vencido: false,
      dias_vencido: 0,
    });
  });

  it('cruce de mes: vence el 31/08, consultado el 01/09 a las 22:30 de Argentina, da 1 día', () => {
    const vencimiento = new Date('2026-08-31T03:00:00.000Z');
    const hoy = new Date('2026-09-02T01:30:00.000Z'); // 22:30 AR del 01/09

    expect(calcularDiasVencido(vencimiento, hoy)).toEqual({
      vencido: true,
      dias_vencido: 1,
    });
  });
});
