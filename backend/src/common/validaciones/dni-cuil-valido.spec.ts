import { BadRequestException } from '@nestjs/common';
import { validarDniCuilValido } from './dni-cuil-valido';

describe('validarDniCuilValido', () => {
  it.each([
    ['DNI de 7 dígitos', '1234567'],
    ['DNI de 8 dígitos', '30712345'],
    ['CUIT/CUIL de 11 dígitos', '20307123456'],
  ])('no lanza con %s', (_caso, dniCuil) => {
    expect(() => validarDniCuilValido(dniCuil)).not.toThrow();
  });

  it.each([
    ['menos de 7 dígitos', '4567'],
    ['9 dígitos (ni DNI ni CUIT/CUIL)', '123456789'],
    ['con guiones', '20-30712345-6'],
    ['con puntos', '30.712.345'],
    ['con letras', '3071234a'],
    ['vacío', ''],
  ])('lanza BadRequestException %s', (_caso, dniCuil) => {
    expect(() => validarDniCuilValido(dniCuil)).toThrow(BadRequestException);
  });
});
