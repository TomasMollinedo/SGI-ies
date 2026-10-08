import { Prisma } from '../../../../generated/prisma/client';
import { montoAnticipoDesdePorcentaje } from './anticipo';

describe('montoAnticipoDesdePorcentaje', () => {
  it('calcula precio × % ÷ 100', () => {
    expect(
      montoAnticipoDesdePorcentaje(
        new Prisma.Decimal('20000000.00'),
        new Prisma.Decimal('30'),
      ).toFixed(2),
    ).toBe('6000000.00');
  });

  it('redondea a dos decimales', () => {
    // 1.000,01 * 33,33 % = 333,303333... -> 333,30
    expect(
      montoAnticipoDesdePorcentaje(
        new Prisma.Decimal('1000.01'),
        new Prisma.Decimal('33.33'),
      ).toFixed(2),
    ).toBe('333.30');
  });

  it('puede redondear a 0 con un porcentaje muy chico sobre un precio bajo (lo valida quien llama)', () => {
    expect(
      montoAnticipoDesdePorcentaje(
        new Prisma.Decimal('10.00'),
        new Prisma.Decimal('0.01'),
      ).isZero(),
    ).toBe(true);
  });
});
