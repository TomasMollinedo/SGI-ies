import { BadRequestException } from '@nestjs/common';

/**
 * Exige `numeroReferencia` cuando la forma de pago usada lo requiere
 * (`FORMAPAGO.requiere_referencia`). Repetido igual en tres lugares
 * (PagoService, CobroService, DeclaracionPagoService) antes de extraerse
 * acá: mismo mensaje, misma condición, sin ninguna diferencia real entre
 * los tres casos de uso.
 */
export function validarNumeroReferencia(
  numeroReferencia: string | undefined,
  formaPago: { requiere_referencia: boolean; nombre: string },
): void {
  if (formaPago.requiere_referencia && !numeroReferencia) {
    throw new BadRequestException(
      `La forma de pago "${formaPago.nombre}" requiere un número de referencia`,
    );
  }
}
