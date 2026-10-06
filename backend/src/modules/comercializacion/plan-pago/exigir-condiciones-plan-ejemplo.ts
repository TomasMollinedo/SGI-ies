import { HttpException, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { ModalidadPago } from '../../../../generated/prisma/enums';

/**
 * `PLANEJEMPLO.tipo` y `PLANEJEMPLO.precio` son nullable en la base desde
 * T121, pero el código del Sprint 3 siempre los escribe. Donde ese código
 * necesita el valor, lo exige con estas guardas en vez de asumirlo con `!`:
 * si alguna vez falta, el error dice qué dato falta en vez de explotar más
 * abajo con un `null`.
 *
 * Por defecto es un 500 (dato inconsistente al leer); quien valida una
 * operación del usuario pasa la excepción que corresponda (ej.
 * `ConflictException` al registrar una venta).
 */
type ExcepcionHttp = new (mensaje: string) => HttpException;

export function exigirPrecioPlanEjemplo(
  precio: Prisma.Decimal | null,
  Excepcion: ExcepcionHttp = InternalServerErrorException,
): Prisma.Decimal {
  if (precio === null) {
    throw new Excepcion('El plan de ejemplo no tiene precio definido');
  }
  return precio;
}

export function exigirTipoPlanEjemplo(
  tipo: ModalidadPago | null,
  Excepcion: ExcepcionHttp = InternalServerErrorException,
): ModalidadPago {
  if (tipo === null) {
    throw new Excepcion('El plan de ejemplo no tiene tipo definido');
  }
  return tipo;
}
