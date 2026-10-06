import { Prisma } from '../../../../generated/prisma/client';
import {
  CondicionesPlanEjemplo,
  calcularImportesPlanEjemplo,
} from './importes-plan-ejemplo';

/**
 * Por defecto, el caso de prueba del sistema francés de
 * `docs/cambios_der_sprint_4.md` expresado como plan de ejemplo: precio de
 * lista 20.000.000, anticipo 50 %, 12 cuotas y TNA 24 %.
 */
const condiciones = (
  parcial: Partial<CondicionesPlanEjemplo> = {},
): CondicionesPlanEjemplo => ({
  precio_lista: new Prisma.Decimal('20000000.00'),
  anticipo_porcentaje: new Prisma.Decimal('50'),
  cantidad_cuotas: 12,
  tasa_nominal_anual: new Prisma.Decimal('24'),
  fecha_venta: new Date('2026-04-14T00:00:00.000Z'),
  ...parcial,
});

describe('calcularImportesPlanEjemplo', () => {
  it('resuelve el anticipo en % a monto y calcula con sistema francés: coincide con el caso de prueba', () => {
    const importes = calcularImportesPlanEjemplo(condiciones());

    expect(importes.anticipo_monto.toFixed(2)).toBe('10000000.00');
    expect(importes.saldo_financiado.toFixed(2)).toBe('10000000.00');
    expect(importes.valor_cuota?.toFixed(2)).toBe('945595.97');
    expect(importes.tasa_mensual?.toFixed(4)).toBe('2.0000');
    expect(importes.total_intereses.toFixed(2)).toBe('1347151.59');
    expect(importes.total_a_pagar.toFixed(2)).toBe('21347151.59');
    expect(importes.cuotas).toHaveLength(13); // la 0 (anticipo) + 12
    expect(importes.cuotas.at(-1)!.importe.toFixed(2)).toBe('945595.92');
  });

  it('devuelve las condiciones con las que calculó', () => {
    const importes = calcularImportesPlanEjemplo(condiciones());

    expect(importes.precio_lista.toFixed(2)).toBe('20000000.00');
    expect(importes.cantidad_cuotas).toBe(12);
    expect(importes.tasa_nominal_anual.toFixed(2)).toBe('24.00');
  });

  it('redondea el anticipo a dos decimales', () => {
    // 1.000,01 * 33,33 % = 333,303333... -> 333,30
    const importes = calcularImportesPlanEjemplo(
      condiciones({
        precio_lista: new Prisma.Decimal('1000.01'),
        anticipo_porcentaje: new Prisma.Decimal('33.33'),
      }),
    );

    expect(importes.anticipo_monto.toFixed(2)).toBe('333.30');
    expect(importes.saldo_financiado.toFixed(2)).toBe('666.71');
    expect(importes.cuotas.at(-1)!.saldo_capital.isZero()).toBe(true);
  });

  it('si cambia el precio de lista, cambian los importes (no se guardan en el plan)', () => {
    const antes = calcularImportesPlanEjemplo(condiciones());
    const despues = calcularImportesPlanEjemplo(
      condiciones({ precio_lista: new Prisma.Decimal('22000000.00') }),
    );

    expect(despues.anticipo_monto.toFixed(2)).toBe('11000000.00');
    expect(despues.valor_cuota!.greaterThan(antes.valor_cuota!)).toBe(true);
  });

  it('si cambia la TNA del plazo, cambian los importes', () => {
    const conTasa = calcularImportesPlanEjemplo(condiciones());
    const sinTasa = calcularImportesPlanEjemplo(
      condiciones({ tasa_nominal_anual: new Prisma.Decimal(0) }),
    );

    // Sin interés: 10.000.000 / 12 = 833.333,33 por cuota.
    expect(sinTasa.valor_cuota?.toFixed(2)).toBe('833333.33');
    expect(sinTasa.total_intereses.isZero()).toBe(true);
    expect(sinTasa.total_a_pagar.toFixed(2)).toBe('20000000.00');
    expect(conTasa.total_intereses.greaterThan(0)).toBe(true);
  });

  it('sin fecha, los vencimientos se cuentan desde hoy', () => {
    const hoy = new Date().toISOString().slice(0, 10);

    const importes = calcularImportesPlanEjemplo(
      condiciones({ fecha_venta: undefined }),
    );

    expect(
      importes.cuotas[0].fecha_vencimiento.toISOString().slice(0, 10),
    ).toBe(hoy);
  });
});
