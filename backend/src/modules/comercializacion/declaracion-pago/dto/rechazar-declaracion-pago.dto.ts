import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const rechazarDeclaracionPagoSchema = z.object({
  motivo_rechazo: z
    .string()
    .trim()
    .min(1, 'El motivo de rechazo es obligatorio')
    .max(500),
});

export class RechazarDeclaracionPagoDto extends createZodDto(
  rechazarDeclaracionPagoSchema,
) {}
