import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/** Motivo obligatorio al despublicar (Decisión cerrada #6). */
export const despublicarPublicacionSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, 'El motivo de despublicación es obligatorio')
    .max(500),
});

export class DespublicarPublicacionDto extends createZodDto(
  despublicarPublicacionSchema,
) {}
