import { Prisma } from '../../../../generated/prisma/client';
import { ModalidadPago } from '../../../../generated/prisma/enums';
import {
  CondicionesPlanPago,
  CuotaGenerada,
  calcularPlanPago,
} from './motor-cuotas';

/**
 * Por defecto, el caso de prueba del sistema francés de
 * `docs/cambios_der_sprint_4.md`: precio 20.000.000, anticipo 10.000.000,
 * 12 cuotas y TNA 24 %.
 */
const condiciones = (
  parcial: Partial<CondicionesPlanPago> = {},
): CondicionesPlanPago => ({
  precio: new Prisma.Decimal('20000000.00'),
  tipo: ModalidadPago.FINANCIADO,
  anticipo_monto: new Prisma.Decimal('10000000.00'),
  cantidad_cuotas: 12,
  tasa_nominal_anual: new Prisma.Decimal('24'),
  fecha_venta: new Date('2026-04-14T00:00:00.000Z'),
  ...parcial,
});

/** Mismo plan con TNA 0 %: el reparto en partes iguales. */
const sinInteres = (parcial: Partial<CondicionesPlanPago> = {}) =>
  condiciones({ tasa_nominal_anual: new Prisma.Decimal(0), ...parcial });

const sumar = (cuotas: CuotaGenerada[], campo: keyof CuotaGenerada) =>
  cuotas.reduce(
    (acumulado, cuota) => acumulado.add(cuota[campo] as Prisma.Decimal),
    new Prisma.Decimal(0),
  );

/** Solo la fecha, que es lo que se mira en los vencimientos (siempre en UTC). */
const fecha = (cuota: CuotaGenerada) =>
  cuota.fecha_vencimiento.toISOString().slice(0, 10);

/** Una cuota como fila de la tabla del caso de prueba. */
const fila = (cuota: CuotaGenerada) => [
  cuota.numero,
  cuota.importe_capital.toFixed(2),
  cuota.importe_interes.toFixed(2),
  cuota.importe.toFixed(2),
  cuota.saldo_capital.toFixed(2),
];

describe('calcularPlanPago', () => {
  describe('FINANCIADO: caso de prueba del sistema francés', () => {
    const plan = calcularPlanPago(condiciones());

    it('cuota fija de 945.595,97 y tasa mensual de 2 %', () => {
      expect(plan.valor_cuota?.toFixed(2)).toBe('945595.97');
      expect(plan.tasa_mensual?.toFixed(4)).toBe('2.0000');
      expect(plan.saldo_financiado.toFixed(2)).toBe('10000000.00');
    });

    it('el cronograma coincide cuota por cuota con el caso de prueba', () => {
      // [cuota, capital, interés, importe, saldo de capital]
      expect(plan.cuotas.map(fila)).toEqual([
        [0, '10000000.00', '0.00', '10000000.00', '10000000.00'],
        [1, '745595.97', '200000.00', '945595.97', '9254404.03'],
        [2, '760507.89', '185088.08', '945595.97', '8493896.14'],
        [3, '775718.05', '169877.92', '945595.97', '7718178.09'],
        [4, '791232.41', '154363.56', '945595.97', '6926945.68'],
        [5, '807057.06', '138538.91', '945595.97', '6119888.62'],
        [6, '823198.20', '122397.77', '945595.97', '5296690.42'],
        [7, '839662.16', '105933.81', '945595.97', '4457028.26'],
        [8, '856455.40', '89140.57', '945595.97', '3600572.86'],
        [9, '873584.51', '72011.46', '945595.97', '2726988.35'],
        [10, '891056.20', '54539.77', '945595.97', '1835932.15'],
        [11, '908877.33', '36718.64', '945595.97', '927054.82'],
        [12, '927054.82', '18541.10', '945595.92', '0.00'],
      ]);
    });

    it('la última cuota amortiza el saldo exacto: 945.595,92 y saldo final 0', () => {
      const ultima = plan.cuotas[plan.cuotas.length - 1];

      expect(ultima.importe.toFixed(2)).toBe('945595.92');
      expect(ultima.saldo_capital.isZero()).toBe(true);
    });

    it('totales: intereses 1.347.151,59 y total a pagar 21.347.151,59', () => {
      expect(plan.total_intereses.toFixed(2)).toBe('1347151.59');
      expect(plan.total_a_pagar.toFixed(2)).toBe('21347151.59');
      // Los totales cierran contra el cronograma.
      expect(
        sumar(plan.cuotas, 'importe_interes').equals(plan.total_intereses),
      ).toBe(true);
      expect(sumar(plan.cuotas, 'importe').equals(plan.total_a_pagar)).toBe(
        true,
      );
    });

    it('en cada cuota, importe = capital + interés', () => {
      for (const cuota of plan.cuotas) {
        expect(
          cuota.importe_capital
            .add(cuota.importe_interes)
            .equals(cuota.importe),
        ).toBe(true);
      }
    });
  });

  describe('FINANCIADO: cierra exacto con cualquier tasa y plazo', () => {
    it.each<[string, string, string, number]>([
      // [precio, anticipo, TNA, cuotas]
      ['20000000.00', '10000000.00', '24', 12],
      ['35000000.00', '7000000.00', '25', 36],
      ['12345678.91', '1234567.89', '47.5', 60],
      ['1000.00', '1.00', '99.99', 7],
      ['100.00', '0.00', '12', 3],
    ])(
      'precio %s, anticipo %s, TNA %s %, %s cuotas: amortiza el precio y el saldo final es 0',
      (precio, anticipo, tna, cuotas) => {
        const plan = calcularPlanPago(
          condiciones({
            precio: new Prisma.Decimal(precio),
            anticipo_monto: new Prisma.Decimal(anticipo),
            tasa_nominal_anual: new Prisma.Decimal(tna),
            cantidad_cuotas: cuotas,
          }),
        );

        expect(plan.cuotas).toHaveLength(cuotas + 1);
        expect(sumar(plan.cuotas, 'importe_capital').toFixed(2)).toBe(precio);
        expect(plan.cuotas.at(-1)!.saldo_capital.isZero()).toBe(true);
        // Todas las cuotas menos la última valen lo mismo (cuota fija).
        for (const cuota of plan.cuotas.slice(1, -1)) {
          expect(cuota.importe.equals(plan.valor_cuota!)).toBe(true);
        }
      },
    );
  });

  describe('FINANCIADO con TNA 0 %', () => {
    it('reparte en partes iguales, sin interés, cuando la división es exacta', () => {
      // 27.000.000 - 5.400.000 = 21.600.000 / 6 = 3.600.000 por cuota.
      const plan = calcularPlanPago(
        sinInteres({
          precio: new Prisma.Decimal('27000000.00'),
          anticipo_monto: new Prisma.Decimal('5400000.00'),
          cantidad_cuotas: 6,
        }),
      );

      expect(plan.cuotas).toHaveLength(7); // la 0 (anticipo) + 6 cuotas
      expect(plan.cuotas[0].importe.toFixed(2)).toBe('5400000.00');
      for (const cuota of plan.cuotas.slice(1)) {
        expect(cuota.importe.toFixed(2)).toBe('3600000.00');
        expect(cuota.importe_interes.isZero()).toBe(true);
        expect(cuota.importe_capital.equals(cuota.importe)).toBe(true);
      }
      expect(plan.valor_cuota?.toFixed(2)).toBe('3600000.00');
      expect(plan.tasa_mensual?.toFixed(4)).toBe('0.0000');
      expect(plan.total_intereses.isZero()).toBe(true);
      expect(plan.total_a_pagar.toFixed(2)).toBe('27000000.00');
    });

    it('carga la diferencia de redondeo en la última cuota y cierra exacto', () => {
      // 10.000.000 - 1.000.000 = 9.000.000 / 7 = 1.285.714,2857... por cuota.
      const plan = calcularPlanPago(
        sinInteres({
          precio: new Prisma.Decimal('10000000.00'),
          anticipo_monto: new Prisma.Decimal('1000000.00'),
          cantidad_cuotas: 7,
        }),
      );

      for (const cuota of plan.cuotas.slice(1, -1)) {
        expect(cuota.importe.toFixed(2)).toBe('1285714.29');
      }
      // 9.000.000 - (1.285.714,29 * 6) = 1.285.714,26: seis centavos menos.
      expect(plan.cuotas.at(-1)!.importe.toFixed(2)).toBe('1285714.26');
      expect(sumar(plan.cuotas, 'importe').toFixed(2)).toBe('10000000.00');
    });

    it('cierra exacto también cuando el redondeo deja la última cuota más cara', () => {
      // 100 / 3 = 33,3333... -> 33,33 por cuota y 33,34 la última.
      const plan = calcularPlanPago(
        sinInteres({
          precio: new Prisma.Decimal('100.00'),
          anticipo_monto: new Prisma.Decimal('0.00'),
          cantidad_cuotas: 3,
        }),
      );

      expect(plan.cuotas.map((cuota) => cuota.importe.toFixed(2))).toEqual([
        '0.00',
        '33.33',
        '33.33',
        '33.34',
      ]);
    });

    it('el saldo de capital baja cuota a cuota hasta 0', () => {
      const plan = calcularPlanPago(
        sinInteres({
          precio: new Prisma.Decimal('27000000.00'),
          anticipo_monto: new Prisma.Decimal('5400000.00'),
          cantidad_cuotas: 6,
        }),
      );

      expect(
        plan.cuotas.map((cuota) => cuota.saldo_capital.toFixed(2)),
      ).toEqual([
        '21600000.00',
        '18000000.00',
        '14400000.00',
        '10800000.00',
        '7200000.00',
        '3600000.00',
        '0.00',
      ]);
    });
  });

  describe('CONTADO', () => {
    const plan = calcularPlanPago(
      condiciones({
        tipo: ModalidadPago.CONTADO,
        precio: new Prisma.Decimal('19000000.00'),
        // En CONTADO el anticipo, las cuotas y la tasa no se miran.
        anticipo_monto: new Prisma.Decimal('19000000.00'),
        cantidad_cuotas: null,
        tasa_nominal_anual: null,
        fecha_venta: new Date('2026-08-01T00:00:00.000Z'),
      }),
    );

    it('genera una sola cuota, número 0, por el total y sin interés, que vence el día de la venta', () => {
      expect(plan.cuotas.map(fila)).toEqual([
        [0, '19000000.00', '0.00', '19000000.00', '0.00'],
      ]);
      expect(fecha(plan.cuotas[0])).toBe('2026-08-01');
    });

    it('sin saldo a financiar, tasa ni valor de cuota; el total es el precio', () => {
      expect(plan.saldo_financiado.isZero()).toBe(true);
      expect(plan.tasa_mensual).toBeNull();
      expect(plan.valor_cuota).toBeNull();
      expect(plan.total_intereses.isZero()).toBe(true);
      expect(plan.total_a_pagar.toFixed(2)).toBe('19000000.00');
    });
  });

  describe('vencimientos (siempre mensuales)', () => {
    it('la cuota 0 vence el mismo día de la venta', () => {
      const fechaVenta = new Date('2026-04-14T00:00:00.000Z');
      const { cuotas } = calcularPlanPago(
        condiciones({ fecha_venta: fechaVenta }),
      );

      expect(cuotas[0].fecha_vencimiento.toISOString()).toBe(
        fechaVenta.toISOString(),
      );
    });

    it('la cuota N vence a N meses de la fecha de venta', () => {
      const { cuotas } = calcularPlanPago(
        condiciones({
          cantidad_cuotas: 6,
          fecha_venta: new Date('2026-04-14T00:00:00.000Z'),
        }),
      );

      expect(cuotas.map(fecha)).toEqual([
        '2026-04-14',
        '2026-05-14',
        '2026-06-14',
        '2026-07-14',
        '2026-08-14',
        '2026-09-14',
        '2026-10-14',
      ]);
    });

    it('cruza de año sin perder meses', () => {
      const { cuotas } = calcularPlanPago(
        condiciones({
          cantidad_cuotas: 3,
          fecha_venta: new Date('2026-11-10T00:00:00.000Z'),
        }),
      );

      expect(cuotas.map(fecha)).toEqual([
        '2026-11-10',
        '2026-12-10',
        '2027-01-10',
        '2027-02-10',
      ]);
    });

    it('venta el 31/01: la cuota a 1 mes vence el último día de febrero (año no bisiesto)', () => {
      const { cuotas } = calcularPlanPago(
        condiciones({
          cantidad_cuotas: 3,
          fecha_venta: new Date('2026-01-31T00:00:00.000Z'),
        }),
      );

      expect(cuotas.map(fecha)).toEqual([
        '2026-01-31',
        // Ni 03/03 ni error: el 31 no existe en febrero de 2026.
        '2026-02-28',
        // El recorte de febrero no se arrastra: marzo sí tiene 31.
        '2026-03-31',
        '2026-04-30',
      ]);
    });

    it('venta el 31/01 en año bisiesto: la cuota de febrero vence el 29', () => {
      const { cuotas } = calcularPlanPago(
        condiciones({
          cantidad_cuotas: 2,
          fecha_venta: new Date('2028-01-31T00:00:00.000Z'),
        }),
      );

      expect(cuotas.map(fecha)).toEqual([
        '2028-01-31',
        '2028-02-29',
        '2028-03-31',
      ]);
    });
  });

  describe('datos incompletos o inválidos', () => {
    it('rechaza un plan FINANCIADO sin cantidad de cuotas', () => {
      expect(() =>
        calcularPlanPago(condiciones({ cantidad_cuotas: null })),
      ).toThrow(/cantidad de cuotas/);
    });

    it('rechaza un plan FINANCIADO con 0 cuotas', () => {
      expect(() =>
        calcularPlanPago(condiciones({ cantidad_cuotas: 0 })),
      ).toThrow(/cantidad de cuotas/);
    });

    it('rechaza un plan FINANCIADO sin tasa nominal anual', () => {
      expect(() =>
        calcularPlanPago(condiciones({ tasa_nominal_anual: null })),
      ).toThrow(/tasa nominal anual/);
    });

    it('rechaza una tasa nominal anual negativa', () => {
      expect(() =>
        calcularPlanPago(
          condiciones({ tasa_nominal_anual: new Prisma.Decimal(-1) }),
        ),
      ).toThrow(/tasa nominal anual/);
    });
  });
});
