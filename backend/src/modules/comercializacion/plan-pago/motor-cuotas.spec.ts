import { Prisma } from '../../../../generated/prisma/client';
import { Periodicidad, TipoPlanPago } from '../../../../generated/prisma/enums';
import {
  CondicionesPlanPago,
  CuotaGenerada,
  generarCuotas,
} from './motor-cuotas';

/** Arma las condiciones del plan sin repetir en cada caso los campos que no importan. */
const condiciones = (
  parcial: Partial<CondicionesPlanPago> = {},
): CondicionesPlanPago => ({
  precio: new Prisma.Decimal('27000000.00'),
  tipo: TipoPlanPago.FINANCIADO,
  anticipo_monto: new Prisma.Decimal('5400000.00'),
  cantidad_cuotas: 6,
  periodicidad: Periodicidad.MENSUAL,
  fecha_venta: new Date('2026-04-14T00:00:00.000Z'),
  ...parcial,
});

const sumar = (cuotas: CuotaGenerada[]) =>
  cuotas.reduce(
    (acumulado, cuota) => acumulado.add(cuota.importe),
    new Prisma.Decimal(0),
  );

/** Solo la fecha, que es lo que se mira en los vencimientos (siempre en UTC). */
const fecha = (cuota: CuotaGenerada) =>
  cuota.fecha_vencimiento.toISOString().slice(0, 10);

describe('generarCuotas', () => {
  describe('CONTADO', () => {
    it('genera una sola cuota, numero 0, por el precio total', () => {
      const cuotas = generarCuotas(
        condiciones({
          tipo: TipoPlanPago.CONTADO,
          precio: new Prisma.Decimal('19000000.00'),
          // En CONTADO el anticipo es el 100% del precio; el motor no lo mira.
          anticipo_monto: new Prisma.Decimal('19000000.00'),
          cantidad_cuotas: null,
          periodicidad: null,
          fecha_venta: new Date('2026-08-01T00:00:00.000Z'),
        }),
      );

      expect(cuotas).toHaveLength(1);
      expect(cuotas[0].numero).toBe(0);
      expect(cuotas[0].importe.toFixed(2)).toBe('19000000.00');
      expect(fecha(cuotas[0])).toBe('2026-08-01');
    });
  });

  describe('FINANCIADO', () => {
    it('reparte en partes iguales cuando la division es exacta', () => {
      // 27.000.000 - 5.400.000 = 21.600.000 / 6 = 3.600.000 por cuota.
      const cuotas = generarCuotas(condiciones());

      expect(cuotas).toHaveLength(7); // la 0 (anticipo) + 6 cuotas
      expect(cuotas[0].importe.toFixed(2)).toBe('5400000.00');
      for (const cuota of cuotas.slice(1)) {
        expect(cuota.importe.toFixed(2)).toBe('3600000.00');
      }
      expect(cuotas.map((cuota) => cuota.numero)).toEqual([
        0, 1, 2, 3, 4, 5, 6,
      ]);
      expect(sumar(cuotas).toFixed(2)).toBe('27000000.00');
    });

    it('carga la diferencia de redondeo en la ultima cuota y cierra exacto', () => {
      // 10.000.000 - 1.000.000 = 9.000.000 / 7 = 1.285.714,2857... por cuota.
      const precio = new Prisma.Decimal('10000000.00');
      const cuotas = generarCuotas(
        condiciones({
          precio,
          anticipo_monto: new Prisma.Decimal('1000000.00'),
          cantidad_cuotas: 7,
        }),
      );

      for (const cuota of cuotas.slice(1, -1)) {
        expect(cuota.importe.toFixed(2)).toBe('1285714.29');
      }

      const ultima = cuotas[cuotas.length - 1];
      expect(ultima.numero).toBe(7);
      // 9.000.000 - (1.285.714,29 * 6) = 1.285.714,26: seis centavos menos.
      expect(ultima.importe.toFixed(2)).toBe('1285714.26');

      // La asercion que pide la tarea: la suma da EXACTAMENTE el precio.
      expect(sumar(cuotas).equals(precio)).toBe(true);
      expect(sumar(cuotas).toFixed(2)).toBe('10000000.00');
    });

    it('cierra exacto tambien cuando el redondeo deja la ultima cuota mas cara', () => {
      // 100 / 3 = 33,3333... -> 33,33 por cuota y 33,34 la ultima.
      const precio = new Prisma.Decimal('100.00');
      const cuotas = generarCuotas(
        condiciones({
          precio,
          anticipo_monto: new Prisma.Decimal('0.00'),
          cantidad_cuotas: 3,
        }),
      );

      expect(cuotas.map((cuota) => cuota.importe.toFixed(2))).toEqual([
        '0.00',
        '33.33',
        '33.33',
        '33.34',
      ]);
      expect(sumar(cuotas).equals(precio)).toBe(true);
    });
  });

  describe('vencimientos', () => {
    it('la cuota 0 vence el mismo dia de la venta', () => {
      const fechaVenta = new Date('2026-04-14T00:00:00.000Z');
      const cuotas = generarCuotas(condiciones({ fecha_venta: fechaVenta }));

      expect(cuotas[0].numero).toBe(0);
      expect(cuotas[0].fecha_vencimiento.toISOString()).toBe(
        fechaVenta.toISOString(),
      );
    });

    it('la cuota N vence a N periodos de la fecha de venta (MENSUAL)', () => {
      const cuotas = generarCuotas(
        condiciones({ fecha_venta: new Date('2026-04-14T00:00:00.000Z') }),
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

    it('respeta la periodicidad TRIMESTRAL', () => {
      const cuotas = generarCuotas(
        condiciones({
          periodicidad: Periodicidad.TRIMESTRAL,
          cantidad_cuotas: 4,
          fecha_venta: new Date('2026-01-10T00:00:00.000Z'),
        }),
      );

      expect(cuotas.map(fecha)).toEqual([
        '2026-01-10',
        '2026-04-10',
        '2026-07-10',
        '2026-10-10',
        '2027-01-10',
      ]);
    });

    it('respeta la periodicidad ANUAL cruzando de anio', () => {
      const cuotas = generarCuotas(
        condiciones({
          periodicidad: Periodicidad.ANUAL,
          cantidad_cuotas: 3,
          fecha_venta: new Date('2026-06-30T00:00:00.000Z'),
        }),
      );

      expect(cuotas.map(fecha)).toEqual([
        '2026-06-30',
        '2027-06-30',
        '2028-06-30',
        '2029-06-30',
      ]);
    });

    it('venta el 31/01: la cuota de febrero vence el ultimo dia del mes (anio no bisiesto)', () => {
      const cuotas = generarCuotas(
        condiciones({
          cantidad_cuotas: 3,
          fecha_venta: new Date('2026-01-31T00:00:00.000Z'),
        }),
      );

      expect(cuotas.map(fecha)).toEqual([
        '2026-01-31',
        // Ni 03/03 ni error: el 31 no existe en febrero de 2026.
        '2026-02-28',
        // El recorte de febrero no se arrastra: marzo si tiene 31.
        '2026-03-31',
        '2026-04-30',
      ]);
    });

    it('venta el 31/01 en anio bisiesto: la cuota de febrero vence el 29', () => {
      const cuotas = generarCuotas(
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

    it('venta el 31/12: la cuota BIMESTRAL cae en el ultimo dia de febrero', () => {
      const cuotas = generarCuotas(
        condiciones({
          periodicidad: Periodicidad.BIMESTRAL,
          cantidad_cuotas: 2,
          fecha_venta: new Date('2026-12-31T00:00:00.000Z'),
        }),
      );

      expect(cuotas.map(fecha)).toEqual([
        '2026-12-31',
        '2027-02-28',
        '2027-04-30',
      ]);
    });
  });

  describe('datos incompletos', () => {
    it('rechaza un plan FINANCIADO sin cantidad de cuotas', () => {
      expect(() =>
        generarCuotas(condiciones({ cantidad_cuotas: null })),
      ).toThrow(/cantidad de cuotas/);
    });

    it('rechaza un plan FINANCIADO sin periodicidad', () => {
      expect(() => generarCuotas(condiciones({ periodicidad: null }))).toThrow(
        /periodicidad/,
      );
    });
  });
});
