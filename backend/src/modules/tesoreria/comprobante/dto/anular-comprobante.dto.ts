import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Cuerpo para anular un comprobante REGISTRADO. El motivo es
 * obligatorio y queda guardado en `motivo_anulacion` para la trazabilidad
 * de la cuenta corriente del proveedor. La confirmación modal la resuelve el
 * frontend; acá solo llega el motivo ya confirmado.
 */
export const anularComprobanteSchema = z.object({
  motivo_anulacion: z
    .string()
    .trim()
    .min(1, 'El motivo de anulación es obligatorio')
    .max(500),
});

export class AnularComprobanteDto extends createZodDto(
  anularComprobanteSchema,
) {}
