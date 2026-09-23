import { BadRequestException } from '@nestjs/common';

/**
 * DNI (7-8 dígitos) o CUIT/CUIL (11 dígitos), sin puntos ni guiones. Única
 * fuente de verdad del formato: la usa tanto esta función (campo obligatorio,
 * alta de cliente al vender presencial, T110) como `completarDatosClienteSchema`
 * (campo opcional, el cliente completando sus propios datos) directamente en
 * su `.regex()` de Zod.
 */
export const DNI_CUIL_REGEX = /^(\d{7,8}|\d{11})$/;

/**
 * Valida el formato de un DNI/CUIL como función reutilizable — igual patrón
 * que `validarTelefonoSoloNumeros` con `CLIENTE.telefono`, para el caso en que
 * el campo es obligatorio y no está detrás de un schema de Zod propio.
 */
export function validarDniCuilValido(dniCuil: string): void {
  if (!DNI_CUIL_REGEX.test(dniCuil)) {
    throw new BadRequestException(
      'El DNI/CUIL debe tener 7 u 8 dígitos (DNI) u 11 dígitos (CUIT/CUIL), sin puntos ni guiones',
    );
  }
}
