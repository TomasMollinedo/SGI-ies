import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const createUnidadMedidaSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  abreviatura: z
    .string()
    .trim()
    .min(1, 'La abreviatura es obligatoria')
    .max(10),
});

export class CreateUnidadMedidaDto extends createZodDto(
  createUnidadMedidaSchema,
) {}
