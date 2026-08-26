import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const createArticuloSchema = z.object({
  codigo: z.string().trim().min(1, 'El código es obligatorio').max(50),
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  descripcion: z.string().trim().max(255).optional(),
  FK_Categoria: z.number().int().positive(),
  FK_UnidadMedida: z.number().int().positive(),
  FK_Marca: z.number().int().positive().optional(),
});

export class CreateArticuloDto extends createZodDto(createArticuloSchema) {}
