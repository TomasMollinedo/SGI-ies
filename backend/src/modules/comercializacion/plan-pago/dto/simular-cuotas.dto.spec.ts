import { simularCuotasSchema } from './simular-cuotas.dto';

const camposConError = (dato: unknown) => {
  const resultado = simularCuotasSchema.safeParse(dato);
  return resultado.success
    ? []
    : resultado.error.issues.map((issue) => issue.path.join('.'));
};

const financiado = {
  tipo: 'FINANCIADO',
  precio: 27000000,
  anticipo_porcentaje: 20,
  cantidad_cuotas: 6,
  periodicidad: 'MENSUAL',
};

/**
 * Las reglas cruzadas no se vuelven a testear en detalle acá: son
 * literalmente las mismas funciones que usa `createPlanPagoSchema` y ya
 * están cubiertas en `create-plan-pago.dto.spec.ts`. Lo que este spec fija es
 * que la simulación las HEREDE (si alguien las duplicara o las salteara, esto
 * se cae) y lo propio del schema: la fecha opcional y los campos que no
 * acepta.
 */
describe('simularCuotasSchema', () => {
  it('acepta las condiciones de un plan FINANCIADO', () => {
    expect(simularCuotasSchema.safeParse(financiado).success).toBe(true);
  });

  it('no exige fecha_venta, pero la convierte a Date si viene', () => {
    expect(simularCuotasSchema.parse(financiado).fecha_venta).toBeUndefined();

    const conFecha = simularCuotasSchema.parse({
      ...financiado,
      fecha_venta: '2026-04-14',
    });
    expect(conFecha.fecha_venta).toEqual(new Date('2026-04-14T00:00:00.000Z'));
  });

  it('ignora FK_publicacion y nombre: simular no necesita una publicación real', () => {
    const simulacion = simularCuotasSchema.parse({
      ...financiado,
      FK_publicacion: 99,
      nombre: 'no se usa',
    });

    expect(simulacion).not.toHaveProperty('FK_publicacion');
    expect(simulacion).not.toHaveProperty('nombre');
  });

  it('hereda la normalización del anticipo en CONTADO', () => {
    const simulacion = simularCuotasSchema.parse({
      tipo: 'CONTADO',
      precio: 19000000,
    });

    expect(simulacion.anticipo_porcentaje).toBe(100);
    expect(simulacion.anticipo_monto).toBeUndefined();
  });

  describe('hereda las reglas cruzadas del alta', () => {
    it('rechaza el anticipo por porcentaje y por monto a la vez', () => {
      expect(
        camposConError({ ...financiado, anticipo_monto: 5400000 }),
      ).toContain('anticipo_monto');
    });

    it('rechaza un anticipo mayor al precio', () => {
      expect(
        camposConError({
          ...financiado,
          anticipo_porcentaje: undefined,
          anticipo_monto: 27000001,
        }),
      ).toContain('anticipo_monto');
    });

    it('rechaza un CONTADO con cuotas o periodicidad', () => {
      expect(
        camposConError({
          tipo: 'CONTADO',
          precio: 19000000,
          cantidad_cuotas: 6,
          periodicidad: 'MENSUAL',
        }),
      ).toEqual(expect.arrayContaining(['cantidad_cuotas', 'periodicidad']));
    });

    it('rechaza un FINANCIADO sin cuotas ni periodicidad', () => {
      expect(
        camposConError({
          tipo: 'FINANCIADO',
          precio: 27000000,
          anticipo_porcentaje: 20,
        }),
      ).toEqual(expect.arrayContaining(['cantidad_cuotas', 'periodicidad']));
    });

    it('rechaza el precio en cero o negativo', () => {
      expect(camposConError({ ...financiado, precio: 0 })).toContain('precio');
      expect(camposConError({ ...financiado, precio: -1 })).toContain('precio');
    });
  });
});
