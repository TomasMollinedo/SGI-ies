import { BadRequestException } from '@nestjs/common';

/**
 * Valida que un teléfono tenga solo dígitos (sin espacios, guiones, puntos,
 * paréntesis ni "+"). Reutilizado por los submódulos de Comercialización que
 * escriben CLIENTE.telefono: VentaService (alta de cliente por venta
 * presencial, T110) y ClienteAuthService (el propio cliente completa/edita su
 * teléfono, PATCH /cliente/me).
 */
export function validarTelefonoSoloNumeros(telefono: string): void {
  if (!/^\d+$/.test(telefono)) {
    throw new BadRequestException('El teléfono debe contener solo números');
  }
}
