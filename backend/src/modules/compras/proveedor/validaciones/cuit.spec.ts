import { esCuitValido } from './cuit';

describe('esCuitValido', () => {
  describe('CUIT válidos', () => {
    // Todos con dígito verificador calculado con el algoritmo real de AFIP.
    it.each([
      '20304050609',
      '30500010912', // CUIT institucional de AFIP, de uso común como ejemplo
      '20329642349',
      '27123456780',
      '30712345612',
    ])('acepta %s', (cuit) => {
      expect(esCuitValido(cuit)).toBe(true);
    });
  });

  describe('CUIT inválidos', () => {
    it('rechaza un dígito verificador incorrecto', () => {
      // Mismo CUIT válido de arriba, con el último dígito cambiado.
      expect(esCuitValido('20304050600')).toBe(false);
    });

    it('rechaza un CUIT cuyo resto da dígito verificador 10 (imposible)', () => {
      expect(esCuitValido('10000000090')).toBe(false);
      expect(esCuitValido('10000000091')).toBe(false);
    });

    it('rechaza menos de once dígitos', () => {
      expect(esCuitValido('2030405060')).toBe(false);
    });

    it('rechaza más de once dígitos', () => {
      expect(esCuitValido('203040506099')).toBe(false);
    });

    it('rechaza CUIT con guiones', () => {
      expect(esCuitValido('20-30405060-9')).toBe(false);
    });

    it('rechaza CUIT con letras', () => {
      expect(esCuitValido('2030405060a')).toBe(false);
    });

    it('rechaza espacios', () => {
      expect(esCuitValido('20304050 09')).toBe(false);
    });

    it('rechaza string vacío', () => {
      expect(esCuitValido('')).toBe(false);
    });
  });
});
