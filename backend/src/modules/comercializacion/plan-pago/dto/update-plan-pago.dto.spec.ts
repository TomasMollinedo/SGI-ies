import { updatePlanPagoSchema } from './update-plan-pago.dto';

const camposConError = (dato: unknown) => {
  const resultado = updatePlanPagoSchema.safeParse(dato);
  return resultado.success
    ? []
    : resultado.error.issues.map((issue) => issue.path.join('.'));
};

const primerMensaje = (dato: unknown) => {
  const resultado = updatePlanPagoSchema.safeParse(dato);
  return resultado.success ? null : resultado.error.issues[0].message;
};

describe('updatePlanPagoSchema', () => {
  describe('campos editables', () => {
    it('acepta una edición solo de precio', () => {
      const resultado = updatePlanPagoSchema.safeParse({ precio: 21000000 });

      expect(resultado.success).toBe(true);
      expect(resultado.data).toEqual({ precio: 21000000 });
    });

    it('acepta precio, porcentaje_ganancia, margen y estado juntos', () => {
      expect(
        updatePlanPagoSchema.safeParse({
          precio: 21000000,
          porcentaje_ganancia: 40,
          margen: 6000000,
          estado: false,
        }).success,
      ).toBe(true);
    });

    it('acepta un body vacío (todos los campos son opcionales)', () => {
      expect(updatePlanPagoSchema.safeParse({}).success).toBe(true);
    });

    it('rechaza el precio en cero o negativo, igual que en el alta', () => {
      expect(camposConError({ precio: 0 })).toContain('precio');
      expect(camposConError({ precio: -1 })).toContain('precio');
    });
  });

  describe('condiciones estructurales: no editables', () => {
    it.each([
      ['tipo', 'FINANCIADO'],
      ['anticipo_porcentaje', 30],
      ['anticipo_monto', 5400000],
      ['cantidad_cuotas', 12],
      ['periodicidad', 'MENSUAL'],
    ])('rechaza %s y explica qué hacer en su lugar', (campo, valor) => {
      const dato = { precio: 21000000, [campo]: valor };

      expect(camposConError(dato)).toContain(campo);
      expect(primerMensaje(dato)).toBe(
        `El campo "${campo}" no es editable: inactivá el plan y creá uno nuevo`,
      );
    });

    it('rechaza aunque el valor mandado sea el mismo que ya tiene el plan', () => {
      // No hay forma de saberlo acá (el schema no conoce el plan guardado),
      // y da igual: la condición estructural no viaja nunca en una edición.
      expect(camposConError({ tipo: 'CONTADO' })).toContain('tipo');
    });

    it('no los deja pasar ni siquiera en null', () => {
      expect(camposConError({ cantidad_cuotas: null })).toContain(
        'cantidad_cuotas',
      );
    });
  });
});
