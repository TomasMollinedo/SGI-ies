import { fechaIsoSchema } from './fecha-iso.schema';

describe('fechaIsoSchema', () => {
  it('ancla una fecha sola a la medianoche de Argentina (UTC-3), no a la medianoche UTC', () => {
    expect(fechaIsoSchema.parse('2026-09-01')).toEqual(
      new Date('2026-09-01T03:00:00.000Z'),
    );
  });

  it('respeta el offset cuando la fecha ya viene con hora y offset', () => {
    expect(fechaIsoSchema.parse('2026-09-01T14:30:00.000-03:00')).toEqual(
      new Date('2026-09-01T17:30:00.000Z'),
    );
  });

  /**
   * El caso que motivó este schema: un pago fechado el primer día de un mes
   * (mandado como fecha sola, ej. `fecha_pago` de un alta de pago) tiene que
   * caer dentro del período que arma el filtro del reporte de egresos para
   * ese mismo mes (`inicioDelDiaIso('2026-09-01')` en el frontend, que
   * produce exactamente este mismo instante). Si acá se anclara a la
   * medianoche UTC en vez de a la de Argentina, ese pago quedaría 3 horas por
   * debajo del borde `gte` del período y el reporte lo mostraría como si no
   * existiera.
   */
  it('cae dentro del período que arma inicioDelDiaIso para el mismo día calendario', () => {
    const fechaCreada = fechaIsoSchema.parse('2026-09-01');
    const inicioDelPeriodo = new Date('2026-09-01T00:00:00.000-03:00');

    expect(fechaCreada.getTime()).toBeGreaterThanOrEqual(
      inicioDelPeriodo.getTime(),
    );
  });
});
