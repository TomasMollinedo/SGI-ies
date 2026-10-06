import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const anularCobroSchema = z.object({
  motivo_anulacion: z
    .string()
    .trim()
    .min(1, 'El motivo de anulación es obligatorio')
    .max(500),
});

export class AnularCobroDto extends createZodDto(anularCobroSchema) {}
