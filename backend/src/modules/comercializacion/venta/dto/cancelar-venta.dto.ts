import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const cancelarVentaSchema = z.object({
  motivo_cancelacion: z
    .string()
    .trim()
    .min(1, 'El motivo de cancelación es obligatorio'),
});

export class CancelarVentaDto extends createZodDto(cancelarVentaSchema) {}
