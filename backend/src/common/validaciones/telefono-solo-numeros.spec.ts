import { BadRequestException } from '@nestjs/common';
import { validarTelefonoSoloNumeros } from './telefono-solo-numeros';

describe('validarTelefonoSoloNumeros', () => {
  it('no lanza si el teléfono tiene solo dígitos', () => {
    expect(() => validarTelefonoSoloNumeros('1122223333')).not.toThrow();
  });

  it.each([
    ['con guiones', '11-2222-3333'],
    ['con espacios', '11 2222 3333'],
    ['con +', '+541122223333'],
    ['con paréntesis', '(11)22223333'],
    ['con letras', '11abc22223333'],
    ['vacío', ''],
  ])('lanza BadRequestException %s', (_caso, telefono) => {
    expect(() => validarTelefonoSoloNumeros(telefono)).toThrow(
      BadRequestException,
    );
  });
});
