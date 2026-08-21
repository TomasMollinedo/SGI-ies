import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { createDepositoSchema } from './create-deposito.dto';

export const updateDepositoSchema = createDepositoSchema.partial().extend({
  // A diferencia de la creación, acá `null` es válido y explícito: significa
  // "quitar el proyecto asignado". Omitir el campo deja el proyecto como está.
  FK_Proyecto: z.number().int().positive().nullable().optional(),
});

export class UpdateDepositoDto extends createZodDto(updateDepositoSchema) {}
