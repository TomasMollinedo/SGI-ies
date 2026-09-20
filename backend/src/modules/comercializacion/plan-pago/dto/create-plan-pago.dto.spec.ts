import { createPlanPagoSchema } from './create-plan-pago.dto';

/** Un alta FINANCIADO válida, sobre la que cada caso pisa lo que quiere probar. */
const planFinanciado = {
  FK_publicacion: 1,
  nombre: 'Financiado 6 cuotas 2-B',
  tipo: 'FINANCIADO',
  precio: 27000000,
  porcentaje_ganancia: 35,
  margen: 7000000,
  anticipo_porcentaje: 20,
  cantidad_cuotas: 6,
  periodicidad: 'MENSUAL',
};

/** Un alta CONTADO válida: sin cuotas ni periodicidad. */
const planContado = {
  FK_publicacion: 1,
  nombre: 'Contado 1-A',
  tipo: 'CONTADO',
  precio: 19000000,
  anticipo_porcentaje: 100,
};

/** El mismo alta pero sin los campos indicados, para probar los obligatorios. */
const sinCampos = (base: Record<string, unknown>, ...campos: string[]) => {
  const copia = { ...base };
  for (const campo of campos) {
    delete copia[campo];
  }
  return copia;
};

/** Campos (por path) que dieron error, para afirmar sobre el campo y no sobre el texto. */
const camposConError = (dato: unknown) => {
  const resultado = createPlanPagoSchema.safeParse(dato);
  return resultado.success
    ? []
    : resultado.error.issues.map((issue) => issue.path.join('.'));
};

const mensajes = (dato: unknown) => {
  const resultado = createPlanPagoSchema.safeParse(dato);
  return resultado.success
    ? []
    : resultado.error.issues.map((issue) => issue.message);
};

describe('createPlanPagoSchema', () => {
  describe('casos válidos', () => {
    it('acepta un plan FINANCIADO con anticipo por porcentaje, cuotas y periodicidad', () => {
      expect(createPlanPagoSchema.safeParse(planFinanciado).success).toBe(true);
    });

    it('acepta un plan FINANCIADO con anticipo por monto', () => {
      expect(
        createPlanPagoSchema.safeParse({
          ...sinCampos(planFinanciado, 'anticipo_porcentaje'),
          anticipo_monto: 5400000,
        }).success,
      ).toBe(true);
    });

    it('acepta un plan CONTADO sin cuotas ni periodicidad', () => {
      expect(createPlanPagoSchema.safeParse(planContado).success).toBe(true);
    });

    it('acepta un plan CONTADO que manda cuotas y periodicidad en null', () => {
      // El frontend suele mandar el formulario completo con los campos
      // deshabilitados en null: eso es "ausente", no un valor cargado.
      expect(
        createPlanPagoSchema.safeParse({
          ...planContado,
          cantidad_cuotas: null,
          periodicidad: null,
        }).success,
      ).toBe(true);
    });

    it('acepta que porcentaje_ganancia y margen no vengan (PLANPAGO los defaultea en 0)', () => {
      expect(
        createPlanPagoSchema.safeParse(
          sinCampos(planFinanciado, 'porcentaje_ganancia', 'margen'),
        ).success,
      ).toBe(true);
    });
  });

  describe('anticipo: porcentaje o monto, nunca los dos', () => {
    it('rechaza el anticipo cargado por porcentaje y por monto a la vez', () => {
      expect(
        camposConError({
          ...planFinanciado,
          anticipo_porcentaje: 20,
          anticipo_monto: 5400000,
        }),
      ).toContain('anticipo_monto');
      expect(
        mensajes({
          ...planFinanciado,
          anticipo_porcentaje: 20,
          anticipo_monto: 5400000,
        }),
      ).toContain(
        'El anticipo se define por porcentaje o por monto, no por los dos a la vez',
      );
    });

    it('rechaza el alta sin ningún anticipo', () => {
      expect(
        camposConError(sinCampos(planFinanciado, 'anticipo_porcentaje')),
      ).toContain('anticipo_porcentaje');
    });

    it('trata el anticipo en null como ausente', () => {
      expect(
        camposConError({
          ...planFinanciado,
          anticipo_porcentaje: null,
          anticipo_monto: null,
        }),
      ).toContain('anticipo_porcentaje');
    });

    it('rechaza un anticipo por porcentaje mayor a 100', () => {
      expect(
        camposConError({ ...planFinanciado, anticipo_porcentaje: 120 }),
      ).toContain('anticipo_porcentaje');
    });
  });

  describe('anticipo_monto contra el precio', () => {
    /** El alta FINANCIADO, pero con el anticipo cargado como monto. */
    const conMonto = (anticipo_monto: number) => ({
      ...sinCampos(planFinanciado, 'anticipo_porcentaje'),
      anticipo_monto,
    });

    it('rechaza un anticipo mayor al precio', () => {
      // Un peso más que el precio ya deja el saldo a financiar en negativo.
      expect(camposConError(conMonto(27000001))).toContain('anticipo_monto');
      expect(mensajes(conMonto(27000001))).toContain(
        'El anticipo no puede ser mayor al precio del plan',
      );
    });

    it('acepta un anticipo igual al precio (caso borde)', () => {
      expect(createPlanPagoSchema.safeParse(conMonto(27000000)).success).toBe(
        true,
      );
    });

    it('acepta un anticipo menor al precio', () => {
      expect(createPlanPagoSchema.safeParse(conMonto(5400000)).success).toBe(
        true,
      );
    });
  });

  describe('CONTADO: el anticipo se normaliza a 100%', () => {
    /** El dato ya parseado, que es donde se ve el efecto del `.transform()`. */
    const parsear = (dato: unknown) => {
      const resultado = createPlanPagoSchema.safeParse(dato);
      if (!resultado.success) {
        throw new Error(
          `No debería fallar: ${resultado.error.issues
            .map((issue) => issue.message)
            .join(', ')}`,
        );
      }
      return resultado.data as Record<string, unknown>;
    };

    it('pisa el anticipo_porcentaje que haya mandado el usuario', () => {
      const data = parsear({ ...planContado, anticipo_porcentaje: 80 });

      expect(data.anticipo_porcentaje).toBe(100);
      expect(data.anticipo_monto).toBeUndefined();
    });

    it('descarta el anticipo_monto y lo reemplaza por el 100%', () => {
      const data = parsear({
        ...sinCampos(planContado, 'anticipo_porcentaje'),
        anticipo_monto: 19000000,
      });

      expect(data.anticipo_porcentaje).toBe(100);
      expect(data.anticipo_monto).toBeUndefined();
    });

    it('completa el anticipo cuando no vino ninguno de los dos', () => {
      const data = parsear(sinCampos(planContado, 'anticipo_porcentaje'));

      expect(data.anticipo_porcentaje).toBe(100);
      expect(data.anticipo_monto).toBeUndefined();
    });
  });

  describe('CONTADO: sin cuotas ni periodicidad', () => {
    it('rechaza un plan CONTADO con cantidad de cuotas', () => {
      expect(camposConError({ ...planContado, cantidad_cuotas: 6 })).toContain(
        'cantidad_cuotas',
      );
      expect(mensajes({ ...planContado, cantidad_cuotas: 6 })).toContain(
        'Un plan CONTADO no lleva cantidad de cuotas',
      );
    });

    it('rechaza un plan CONTADO con periodicidad', () => {
      expect(
        camposConError({ ...planContado, periodicidad: 'MENSUAL' }),
      ).toContain('periodicidad');
    });
  });

  describe('FINANCIADO: cuotas y periodicidad obligatorias', () => {
    it('rechaza un plan FINANCIADO sin cantidad de cuotas', () => {
      expect(
        camposConError(sinCampos(planFinanciado, 'cantidad_cuotas')),
      ).toContain('cantidad_cuotas');
    });

    it('rechaza un plan FINANCIADO sin periodicidad', () => {
      expect(
        camposConError(sinCampos(planFinanciado, 'periodicidad')),
      ).toContain('periodicidad');
    });

    it('rechaza un plan FINANCIADO con cuotas y periodicidad en null', () => {
      expect(
        camposConError({
          ...planFinanciado,
          cantidad_cuotas: null,
          periodicidad: null,
        }),
      ).toEqual(expect.arrayContaining(['cantidad_cuotas', 'periodicidad']));
    });

    it('rechaza una periodicidad que no está en el enum', () => {
      expect(
        camposConError({ ...planFinanciado, periodicidad: 'QUINCENAL' }),
      ).toContain('periodicidad');
    });

    it('rechaza una cantidad de cuotas con decimales', () => {
      expect(
        camposConError({ ...planFinanciado, cantidad_cuotas: 6.5 }),
      ).toContain('cantidad_cuotas');
    });
  });

  describe('precio', () => {
    it('rechaza el precio en cero', () => {
      expect(camposConError({ ...planFinanciado, precio: 0 })).toContain(
        'precio',
      );
      expect(mensajes({ ...planFinanciado, precio: 0 })).toContain(
        'El precio debe ser mayor a 0',
      );
    });

    it('rechaza un precio negativo', () => {
      expect(camposConError({ ...planFinanciado, precio: -1000 })).toContain(
        'precio',
      );
    });

    it('rechaza un precio con más de dos decimales', () => {
      expect(camposConError({ ...planFinanciado, precio: 100.123 })).toContain(
        'precio',
      );
    });

    it('es obligatorio', () => {
      expect(camposConError(sinCampos(planFinanciado, 'precio'))).toContain(
        'precio',
      );
    });
  });
});
