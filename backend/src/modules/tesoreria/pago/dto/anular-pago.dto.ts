import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Payload de la anulación..
 */
export const anularOrdenPagoSchema = z.object({
  motivo_anulacion: z
    .string()
    .trim()
    .min(1, 'El motivo de anulación es obligatorio')
    .max(500),
});

export class AnularOrdenPagoDto extends createZodDto(anularOrdenPagoSchema) {}
