import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const createCategoriaSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  descripcion: z.string().trim().max(255).optional(),
});

export class CreateCategoriaDto extends createZodDto(createCategoriaSchema) {}
