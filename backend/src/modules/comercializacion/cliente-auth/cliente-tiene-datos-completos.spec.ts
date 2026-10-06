import { clienteTieneDatosCompletos } from './cliente-tiene-datos-completos';

describe('clienteTieneDatosCompletos', () => {
  it('devuelve true si dni_cuil y telefono están cargados', () => {
    expect(
      clienteTieneDatosCompletos({
        dni_cuil: '20-12345678-9',
        telefono: '11-2222-3333',
      }),
    ).toBe(true);
  });

  it('devuelve false si falta dni_cuil', () => {
    expect(
      clienteTieneDatosCompletos({
        dni_cuil: null,
        telefono: '11-2222-3333',
      }),
    ).toBe(false);
  });

  it('devuelve false si falta telefono', () => {
    expect(
      clienteTieneDatosCompletos({
        dni_cuil: '20-12345678-9',
        telefono: null,
      }),
    ).toBe(false);
  });

  it('devuelve false si faltan ambos', () => {
    expect(clienteTieneDatosCompletos({ dni_cuil: null, telefono: null })).toBe(
      false,
    );
  });
});
