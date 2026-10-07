import {
  contentDispositionInline,
  normalizarNombreComprobante,
} from './comprobante-archivo';

describe('normalizarNombreComprobante', () => {
  it('deja igual un nombre común', () => {
    expect(normalizarNombreComprobante('pago.pdf')).toBe('pago.pdf');
  });

  it('conserva tildes, ñ y caracteres fuera de latin1 (no decodifica nada)', () => {
    expect(normalizarNombreComprobante('transferencia año cuota Nº3.pdf')).toBe(
      'transferencia año cuota Nº3.pdf',
    );
    // El guion largo es U+2013: no existe en latin1.
    expect(normalizarNombreComprobante('constancia año–2026.pdf')).toBe(
      'constancia año–2026.pdf',
    );
  });

  it('quita los caracteres de control', () => {
    expect(normalizarNombreComprobante('pa\u0000go\r\n\t.pdf\u007f')).toBe(
      'pago.pdf',
    );
  });

  it('quita los separadores de ruta', () => {
    expect(normalizarNombreComprobante('../../etc/passwd')).toBe(
      '....etcpasswd',
    );
    expect(normalizarNombreComprobante('C:\\Users\\yo\\pago.pdf')).toBe(
      'C:Usersyopago.pdf',
    );
  });

  it('recorta los espacios de los bordes', () => {
    expect(normalizarNombreComprobante('   pago.pdf  ')).toBe('pago.pdf');
  });

  it('usa "comprobante" si no queda nada', () => {
    expect(normalizarNombreComprobante('')).toBe('comprobante');
    expect(normalizarNombreComprobante(' /\\\u0000 ')).toBe('comprobante');
  });

  it('trunca a 255 caracteres', () => {
    const resultado = normalizarNombreComprobante('a'.repeat(300));

    expect(resultado).toBe('a'.repeat(255));
  });

  it('al truncar no parte un carácter de dos unidades UTF-16 al medio', () => {
    const resultado = normalizarNombreComprobante('😀'.repeat(300));

    expect(Array.from(resultado)).toHaveLength(255);
    expect(resultado).toBe('😀'.repeat(255));
  });
});

describe('contentDispositionInline', () => {
  it('un nombre ASCII va igual en filename y en filename*', () => {
    expect(contentDispositionInline('pago.pdf')).toBe(
      `inline; filename="pago.pdf"; filename*=UTF-8''pago.pdf`,
    );
  });

  it('el fallback ASCII reemplaza lo que no es ASCII, y filename* lleva el nombre real', () => {
    expect(contentDispositionInline('año.pdf')).toBe(
      `inline; filename="a_o.pdf"; filename*=UTF-8''a%C3%B1o.pdf`,
    );
  });

  it('codifica en filename* un nombre con caracteres fuera de latin1, sin tirar error', () => {
    const header = contentDispositionInline('constancia año–2026.pdf');

    expect(header).toBe(
      `inline; filename="constancia a_o_2026.pdf"; filename*=UTF-8''constancia%20a%C3%B1o%E2%80%932026.pdf`,
    );
  });

  it('el fallback ASCII no lleva comillas ni barras: no se puede cerrar el valor ni inyectar otro parámetro', () => {
    const header = contentDispositionInline('a"; filename="x/y\\z.html');

    expect(header.startsWith('inline; filename="a; filename=xyz.html"; ')).toBe(
      true,
    );
    // Todo lo que sigue al fallback es el filename* codificado: sin comillas.
    expect(header.split(`filename*=UTF-8''`)[1]).not.toMatch(/["\\/;]/);
  });

  it(`escapa ' ( ) * en filename*, que encodeURIComponent deja pasar`, () => {
    const header = contentDispositionInline(`pago (1)*'final'.pdf`);

    expect(header.split(`filename*=UTF-8''`)[1]).toBe(
      'pago%20%281%29%2A%27final%27.pdf',
    );
  });

  it('nunca lleva saltos de línea, aunque el nombre guardado los tenga', () => {
    const header = contentDispositionInline('pago\r\nSet-Cookie: x=1.pdf');

    expect(header).not.toMatch(/[\r\n]/);
  });

  it('usa "comprobante" como fallback si no queda ningún carácter ASCII', () => {
    expect(contentDispositionInline('"/\\')).toBe(
      `inline; filename="comprobante"; filename*=UTF-8''%22%2F%5C`,
    );
  });
});
