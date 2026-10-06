import { simularPlanCatalogoSchema } from './simular-plan-catalogo.dto';

const camposConError = (dato: unknown) => {
  const resultado = simularPlanCatalogoSchema.safeParse(dato);
  return resultado.success
    ? []
    : resultado.error.issues.map((issue) => issue.path.join('.'));
};

describe('simularPlanCatalogoSchema', () => {
  it('acepta el anticipo en porcentaje', () => {
    expect(
      simularPlanCatalogoSchema.safeParse({
        FK_plazo_financiacion: 1,
        anticipo_porcentaje: 30,
      }).success,
    ).toBe(true);
  });

  it('acepta el anticipo en monto', () => {
    expect(
      simularPlanCatalogoSchema.safeParse({
        FK_plazo_financiacion: 1,
        anticipo_monto: 5700000.5,
      }).success,
    ).toBe(true);
  });

  it('exige el plazo', () => {
    expect(camposConError({ anticipo_porcentaje: 30 })).toContain(
      'FK_plazo_financiacion',
    );
  });

  it('rechaza mandar monto y porcentaje a la vez', () => {
    expect(
      camposConError({
        FK_plazo_financiacion: 1,
        anticipo_porcentaje: 30,
        anticipo_monto: 5700000,
      }),
    ).toContain('anticipo_monto');
  });

  it('rechaza no mandar ningún anticipo', () => {
    expect(camposConError({ FK_plazo_financiacion: 1 })).toContain(
      'anticipo_monto',
    );
  });

  it.each([0, -5, 100, 150])(
    'rechaza un porcentaje de %s (debe ser mayor a 0 y menor a 100)',
    (porcentaje) => {
      expect(
        camposConError({
          FK_plazo_financiacion: 1,
          anticipo_porcentaje: porcentaje,
        }),
      ).toContain('anticipo_porcentaje');
    },
  );

  it.each([0, -1])('rechaza un monto de %s (debe ser mayor a 0)', (monto) => {
    expect(
      camposConError({ FK_plazo_financiacion: 1, anticipo_monto: monto }),
    ).toContain('anticipo_monto');
  });

  it('rechaza más de dos decimales en el anticipo', () => {
    expect(
      camposConError({ FK_plazo_financiacion: 1, anticipo_monto: 100.123 }),
    ).toContain('anticipo_monto');
  });

  it('rechaza un plazo que no es un id entero positivo', () => {
    expect(
      camposConError({ FK_plazo_financiacion: 1.5, anticipo_porcentaje: 30 }),
    ).toContain('FK_plazo_financiacion');
    expect(
      camposConError({ FK_plazo_financiacion: 0, anticipo_porcentaje: 30 }),
    ).toContain('FK_plazo_financiacion');
  });
});
