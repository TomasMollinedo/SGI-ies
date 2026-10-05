import { Prisma } from '../../../../generated/prisma/client';
import {
  ModalidadPago,
  Periodicidad,
} from '../../../../generated/prisma/enums';
import {
  CuotaConDesglose,
  completarDesgloseTasaCero,
} from './desglose-tasa-cero';
import { CondicionesPlanPago, generarCuotas } from './motor-cuotas';

/** Arma las condiciones del plan sin repetir en cada caso los campos que no importan. */
const condiciones = (
  parcial: Partial<CondicionesPlanPago> = {},
): CondicionesPlanPago => ({
  precio: new Prisma.Decimal('27000000.00'),
  tipo: ModalidadPago.FINANCIADO,
  anticipo_monto: new Prisma.Decimal('5400000.00'),
  cantidad_cuotas: 6,
  periodicidad: Periodicidad.MENSUAL,
  fecha_venta: new Date('2026-04-14T00:00:00.000Z'),
  ...parcial,
});

/** El cronograma del motor ya con su desglose, que es como lo usa la venta. */
const desglosar = (parcial: Partial<CondicionesPlanPago> = {}) => {
  const datos = condiciones(parcial);
  return completarDesgloseTasaCero(generarCuotas(datos), datos.precio);
};

const sumarCapital = (cuotas: CuotaConDesglose[]) =>
  cuotas.reduce(
    (acumulado, cuota) => acumulado.add(cuota.importe_capital),
    new Prisma.Decimal(0),
  );

describe('completarDesgloseTasaCero', () => {
  it('CONTADO: una sola cuota, todo capital, sin interes y con saldo 0', () => {
    const cuotas = desglosar({
      tipo: ModalidadPago.CONTADO,
      precio: new Prisma.Decimal('19000000.00'),
      anticipo_monto: new Prisma.Decimal('19000000.00'),
      cantidad_cuotas: null,
      periodicidad: null,
    });

    expect(cuotas).toHaveLength(1);
    expect(cuotas[0].numero).toBe(0);
    expect(cuotas[0].importe.toFixed(2)).toBe('19000000.00');
    expect(cuotas[0].importe_capital.toFixed(2)).toBe('19000000.00');
    expect(cuotas[0].importe_interes.toFixed(2)).toBe('0.00');
    expect(cuotas[0].saldo_capital.toFixed(2)).toBe('0.00');
  });

  it('FINANCIADO con anticipo: la cuota 0 queda con el saldo a financiar y la ultima en 0', () => {
    // 27.000.000 - 5.400.000 = 21.600.000 / 6 = 3.600.000 por cuota.
    const cuotas = desglosar();

    expect(cuotas).toHaveLength(7);
    expect(cuotas.map((cuota) => cuota.saldo_capital.toFixed(2))).toEqual([
      '21600000.00',
      '18000000.00',
      '14400000.00',
      '10800000.00',
      '7200000.00',
      '3600000.00',
      '0.00',
    ]);
    for (const cuota of cuotas) {
      expect(cuota.importe_capital.equals(cuota.importe)).toBe(true);
      expect(cuota.importe_interes.toFixed(2)).toBe('0.00');
    }
  });

  it('FINANCIADO con anticipo 0: la cuota 0 queda con el precio completo como saldo', () => {
    const cuotas = desglosar({
      precio: new Prisma.Decimal('12000000.00'),
      anticipo_monto: new Prisma.Decimal('0'),
      cantidad_cuotas: 3,
    });

    expect(cuotas).toHaveLength(4);
    expect(cuotas[0].importe.toFixed(2)).toBe('0.00');
    expect(cuotas[0].importe_capital.toFixed(2)).toBe('0.00');
    expect(cuotas[0].saldo_capital.toFixed(2)).toBe('12000000.00');
    expect(cuotas[1].saldo_capital.toFixed(2)).toBe('8000000.00');
    expect(cuotas[3].saldo_capital.toFixed(2)).toBe('0.00');
  });

  it('la suma de capital da exactamente el precio aunque el reparto tenga redondeo', () => {
    // 10.000.000 / 3 no es exacto: el motor ajusta la ultima cuota.
    const precio = new Prisma.Decimal('10000000.00');
    const cuotas = desglosar({
      precio,
      anticipo_monto: new Prisma.Decimal('0'),
      cantidad_cuotas: 3,
    });

    expect(sumarCapital(cuotas).equals(precio)).toBe(true);
    expect(cuotas.map((cuota) => cuota.saldo_capital.toFixed(2))).toEqual([
      '10000000.00',
      '6666666.67',
      '3333333.34',
      '0.00',
    ]);
  });

  it('conserva numero y vencimiento de cada cuota del motor', () => {
    const datos = condiciones();
    const originales = generarCuotas(datos);
    const cuotas = completarDesgloseTasaCero(originales, datos.precio);

    expect(cuotas.map((cuota) => cuota.numero)).toEqual(
      originales.map((cuota) => cuota.numero),
    );
    expect(cuotas.map((cuota) => cuota.fecha_vencimiento)).toEqual(
      originales.map((cuota) => cuota.fecha_vencimiento),
    );
  });
});
