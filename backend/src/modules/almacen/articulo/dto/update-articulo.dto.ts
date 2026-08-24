import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { createArticuloSchema } from './create-articulo.dto';

export const updateArticuloSchema = createArticuloSchema.partial().extend({
  // Igual que en Depósito: `null` explícito = quitar la marca asignada.
  // Omitir el campo deja la marca como está.
  FK_Marca: z.number().int().positive().nullable().optional(),
});

export class UpdateArticuloDto extends createZodDto(updateArticuloSchema) {}